import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse

from app.agents.llm import ChatModelsDep
from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.saarthi import (
    ActionDecisionOut,
    ActionOut,
    ChatIn,
    ChatMessageOut,
    ChatSessionDetailOut,
    ChatSessionOut,
    FeedbackIn,
    FillIn,
    FillOut,
    ProposeIn,
    TodayOut,
)
from app.services import saarthi_actions, saarthi_chat, saarthi_fill, saarthi_today

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/saarthi", tags=["saarthi"])


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat(
    body: ChatIn, db: DbSession, member: CurrentMemberDep, models: ChatModelsDep
) -> StreamingResponse:
    # Limits, ownership and validation fail here as normal JSON errors, before streaming starts.
    session, history = await saarthi_chat.start_turn(db, member, body)

    async def events() -> AsyncIterator[str]:
        try:
            async for event, data in saarthi_chat.stream_reply(
                db, member, session, history, body, models
            ):
                yield _sse(event, data)
        except Exception:
            # Headers are already sent, so report a friendly error event instead of a 500.
            logger.exception("saarthi stream failed")
            yield _sse("error", {"code": "saarthi_failed", "message": saarthi_chat.FRIENDLY_ERROR})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(db: DbSession, member: CurrentMemberDep) -> list[ChatSessionOut]:
    sessions = await saarthi_chat.list_sessions(db, member)
    return [ChatSessionOut.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailOut)
async def get_session(
    session_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ChatSessionDetailOut:
    return await saarthi_chat.get_session_detail(db, member, session_id)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> Response:
    await saarthi_chat.delete_session(db, member, session_id)
    return Response(status_code=204)


@router.post("/messages/{message_id}/feedback", response_model=ChatMessageOut)
async def feedback(
    message_id: uuid.UUID, body: FeedbackIn, db: DbSession, member: CurrentMemberDep
) -> ChatMessageOut:
    return await saarthi_chat.set_feedback(db, member, message_id, body)


@router.post("/fill", response_model=FillOut)
async def fill_form(
    body: FillIn, db: DbSession, member: CurrentMemberDep, models: ChatModelsDep
) -> FillOut:
    """Fill with Saarthi: a sentence becomes form values. The resident still submits."""
    return await saarthi_fill.fill(db, member, body, models)


@router.get("/today", response_model=TodayOut)
async def today_summary(db: DbSession, member: CurrentMemberDep, models: ChatModelsDep) -> TodayOut:
    """Home "Today in your society". Cached per resident per day until the facts change."""
    return await saarthi_today.today(db, member, models)


@router.post("/actions/propose", response_model=ChatMessageOut, status_code=201)
async def propose_action(
    body: ProposeIn, db: DbSession, member: CurrentMemberDep
) -> ChatMessageOut:
    return await saarthi_actions.propose(db, member, body)


@router.get("/actions/{action_id}", response_model=ActionOut)
async def get_action(action_id: uuid.UUID, db: DbSession, member: CurrentMemberDep) -> ActionOut:
    return await saarthi_actions.get_action(db, member, action_id)


# Nothing Saarthi proposes changes anything until the resident confirms it here.
@router.post("/actions/{action_id}/confirm", response_model=ActionDecisionOut)
async def confirm_action(
    action_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ActionDecisionOut:
    return await saarthi_actions.confirm(db, member, action_id)


@router.post("/actions/{action_id}/cancel", response_model=ActionDecisionOut)
async def cancel_action(
    action_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ActionDecisionOut:
    return await saarthi_actions.cancel(db, member, action_id)
