"""Saarthi conversations: private to one resident, always scoped to their society."""

import time
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import saarthi
from app.agents.llm import ChatModels
from app.agents.prompts import system_prompt
from app.auth.deps import CurrentMember
from app.core import rate_limit
from app.core.config import get_settings
from app.core.errors import AppError
from app.models import ChatMessage, ChatSession, Society
from app.models.enums import ChatMessageStatus, ChatRole, LlmOutcome, LlmPurpose
from app.schemas.saarthi import ChatIn, ChatMessageOut, ChatSessionDetailOut, FeedbackIn
from app.services import llm_usage

RECENT_SESSIONS = 30
TITLE_CHARS = 80
FRIENDLY_ERROR = "I couldn't reach the server just now. Try again?"


def _owned_sessions(member: CurrentMember) -> Any:
    return select(ChatSession).where(
        ChatSession.society_id == member.society_id,
        ChatSession.user_id == member.user.id,
        ChatSession.deleted_at.is_(None),
    )


async def list_sessions(db: AsyncSession, member: CurrentMember) -> list[ChatSession]:
    query = _owned_sessions(member).order_by(ChatSession.last_message_at.desc())
    return list(await db.scalars(query.limit(RECENT_SESSIONS)))


async def get_session(
    db: AsyncSession, member: CurrentMember, session_id: uuid.UUID
) -> ChatSession:
    session = await db.scalar(_owned_sessions(member).where(ChatSession.id == session_id))
    if session is None:
        raise AppError("not_found", "Chat not found.", 404)
    return session


async def _messages(db: AsyncSession, session: ChatSession) -> list[ChatMessage]:
    query = (
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session.id,
            ChatMessage.society_id == session.society_id,
        )
        # On a timestamp tie the resident's message ("user") sorts before the reply.
        .order_by(ChatMessage.created_at, ChatMessage.role.desc())
    )
    return list(await db.scalars(query))


async def get_session_detail(
    db: AsyncSession, member: CurrentMember, session_id: uuid.UUID
) -> ChatSessionDetailOut:
    session = await get_session(db, member, session_id)
    messages = [ChatMessageOut.model_validate(m) for m in await _messages(db, session)]
    return ChatSessionDetailOut(
        id=session.id,
        title=session.title,
        last_message_at=session.last_message_at,
        messages=messages,
    )


async def delete_session(db: AsyncSession, member: CurrentMember, session_id: uuid.UUID) -> None:
    session = await get_session(db, member, session_id)
    session.deleted_at = datetime.now(UTC)
    await db.commit()


async def set_feedback(
    db: AsyncSession, member: CurrentMember, message_id: uuid.UUID, body: FeedbackIn
) -> ChatMessageOut:
    message = await db.scalar(
        select(ChatMessage)
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(
            ChatMessage.id == message_id,
            ChatMessage.society_id == member.society_id,
            ChatSession.user_id == member.user.id,
            ChatSession.deleted_at.is_(None),
        )
    )
    if message is None:
        raise AppError("not_found", "Message not found.", 404)
    if message.role != ChatRole.assistant:
        raise AppError("validation_error", "Only Saarthi's replies can be rated.", 422)
    message.feedback = body.rating
    message.feedback_reason = body.reason or None
    await db.commit()
    return ChatMessageOut.model_validate(message)


async def start_turn(
    db: AsyncSession, member: CurrentMember, body: ChatIn
) -> tuple[ChatSession, list[tuple[ChatRole, str]]]:
    """Checks limits, saves the resident's message and returns the session plus prior history."""
    settings = get_settings()
    await rate_limit.enforce(
        f"saarthi_chat:{member.user.id}",
        [(settings.SAARTHI_CHAT_PER_10MIN, 600), (settings.SAARTHI_CHAT_PER_DAY, 86_400)],
        "You've sent a lot of messages. Try again in a few minutes.",
    )
    now = datetime.now(UTC)
    history: list[tuple[ChatRole, str]] = []
    if body.session_id is None:
        session = ChatSession(
            society_id=member.society_id,
            user_id=member.user.id,
            title=body.message[:TITLE_CHARS],
            last_message_at=now,
        )
        db.add(session)
        await db.flush()
    else:
        session = await get_session(db, member, body.session_id)
        previous = [m for m in await _messages(db, session) if m.status == ChatMessageStatus.ok]
        history = [(m.role, m.content) for m in previous[-settings.SAARTHI_HISTORY_MESSAGES :]]
        session.last_message_at = now
    db.add(
        ChatMessage(
            society_id=member.society_id,
            session_id=session.id,
            role=ChatRole.user,
            content=body.message,
            created_at=now,
        )
    )
    await db.commit()
    return session, history


async def stream_reply(
    db: AsyncSession,
    member: CurrentMember,
    session: ChatSession,
    history: list[tuple[ChatRole, str]],
    body: ChatIn,
    models: ChatModels,
) -> AsyncIterator[tuple[str, dict[str, Any]]]:
    """Yields SSE events; saves Saarthi's reply (or a friendly error) and the model call."""
    yield "session", {"sessionId": str(session.id), "title": session.title}
    society = await db.get(Society, member.society_id)
    system = system_prompt(
        first_name=(member.user.name or "there").split()[0],
        society_name=society.name if society else "your society",
        page=body.page,
        now=datetime.now(UTC),
    )
    messages = saarthi.build_messages(system, history, body.message)
    started = time.perf_counter()
    result: saarthi.TurnResult | None = None
    async for kind, payload in saarthi.stream_turn(
        models, messages, {"session_id": str(session.id), "society_id": str(member.society_id)}
    ):
        if kind == "result":
            result = payload
        elif kind == "reset":
            yield "reset", {}
        else:
            yield kind, {"text": payload}
    assert result is not None
    failed = result.outcome == LlmOutcome.error

    reply = ChatMessage(
        society_id=member.society_id,
        session_id=session.id,
        role=ChatRole.assistant,
        content=FRIENDLY_ERROR if failed else result.text,
        status=ChatMessageStatus.error if failed else ChatMessageStatus.ok,
        created_at=datetime.now(UTC),
    )
    db.add(reply)
    session.last_message_at = reply.created_at
    await db.flush()
    llm_usage.record_call(
        db,
        society_id=member.society_id,
        user_id=member.user.id,
        session_id=session.id,
        message_id=reply.id,
        purpose=LlmPurpose.chat,
        model=result.model,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        latency_ms=int((time.perf_counter() - started) * 1000),
        outcome=result.outcome,
        error_code=result.error_code,
        detail={"page": body.page, "history_messages": len(history)},
    )
    await db.commit()
    if failed:
        yield "error", {"code": "saarthi_failed", "message": FRIENDLY_ERROR}
    else:
        yield "done", {"messageId": str(reply.id)}
