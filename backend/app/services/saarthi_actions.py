"""Saarthi's proposed changes: recorded as cards, run only when the resident confirms.

Every row is also the audit trail: who asked, what, when, through Saarthi, and how it ended.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic_core import to_jsonable_python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import Recorder
from app.agents.tools.base import Proposal, ToolContext, WriteSpec
from app.agents.tools.committee import COMMITTEE_WRITES
from app.agents.tools.write import RESIDENT_WRITES
from app.auth import CurrentMember
from app.core import rate_limit
from app.core.config import get_settings
from app.core.errors import AppError
from app.models import ChatMessage, ChatSession, SaarthiAction
from app.models.enums import ActionStatus, ChatRole
from app.schemas.saarthi import ActionDecisionOut, ActionOut, ChatMessageOut

PROPOSAL_MINUTES = 30
WRITES = {spec.name: spec for spec in [*RESIDENT_WRITES, *COMMITTEE_WRITES]}
CANCELLED_MESSAGE = "Okay, I won't do that."


def card(action: SaarthiAction) -> dict[str, Any]:
    """The confirmation card as the frontend renders it, with its current status."""
    expired = action.status == ActionStatus.proposed and action.expires_at < datetime.now(UTC)
    return {
        **action.card,
        "id": str(action.id),
        "status": ActionStatus.expired.value if expired else action.status.value,
        "result": action.result or None,
        "error": action.error,
    }


def recorder(db: AsyncSession, member: CurrentMember, session: ChatSession) -> Recorder:
    async def record(spec: WriteSpec, proposal: Proposal) -> dict[str, Any]:
        action_id = uuid.uuid4()
        edit_href = (
            proposal.edit_href.replace("{action}", str(action_id)) if (proposal.edit_href) else None
        )
        action = SaarthiAction(
            id=action_id,
            society_id=member.society_id,
            user_id=member.user.id,
            session_id=session.id,
            tool=spec.name,
            payload=to_jsonable_python(proposal.payload),
            card={
                "tool": spec.name,
                "title": proposal.title,
                "lines": [{"label": label, "value": value} for label, value in proposal.lines],
                "warning": proposal.warning,
                "approval": proposal.approval,
                "editHref": edit_href,
                "draftOnly": proposal.draft_only,
                "confirmLabel": proposal.confirm_label,
            },
            status=ActionStatus.proposed,
            expires_at=datetime.now(UTC) + timedelta(minutes=PROPOSAL_MINUTES),
        )
        db.add(action)
        await db.flush()
        return card(action)

    return record


async def _owned(db: AsyncSession, member: CurrentMember, action_id: uuid.UUID) -> SaarthiAction:
    action = await db.scalar(
        select(SaarthiAction).where(
            SaarthiAction.id == action_id,
            SaarthiAction.society_id == member.society_id,
            SaarthiAction.user_id == member.user.id,
        )
    )
    if action is None:
        raise AppError("not_found", "Action not found.", 404)
    return action


async def get_action(db: AsyncSession, member: CurrentMember, action_id: uuid.UUID) -> ActionOut:
    action = await _owned(db, member, action_id)
    return ActionOut(card=card(action), tool=action.tool, payload=action.payload)


async def _reply(db: AsyncSession, action: SaarthiAction, content: str) -> ChatMessage:
    message = ChatMessage(
        society_id=action.society_id,
        session_id=action.session_id,
        role=ChatRole.assistant,
        content=content,
        created_at=datetime.now(UTC),
    )
    db.add(message)
    session = await db.get(ChatSession, action.session_id)
    if session is not None:
        session.last_message_at = message.created_at
    return message


def _require_open(action: SaarthiAction) -> None:
    if action.status != ActionStatus.proposed:
        raise AppError("already_decided", "This was already decided.", 409)
    if action.expires_at < datetime.now(UTC):
        raise AppError("expired", "This card has expired. Ask Saarthi again.", 410)


async def confirm(
    db: AsyncSession, member: CurrentMember, action_id: uuid.UUID
) -> ActionDecisionOut:
    """Runs the stored proposal through the same service the app uses, as this resident."""
    action = await _owned(db, member, action_id)
    _require_open(action)
    spec = WRITES.get(action.tool)
    if spec is None or action.card.get("draftOnly"):
        raise AppError("needs_form", "Open the form to finish this one.", 422)
    await rate_limit.enforce(
        f"saarthi_actions:{member.user.id}",
        [(get_settings().SAARTHI_ACTIONS_PER_HOUR, 3600)],
        "That's a lot of changes in a short time. Try again in a little while.",
    )
    ctx = ToolContext(db=db, member=member, now=datetime.now(UTC))
    try:
        outcome = await spec.execute(ctx, action.payload)
    except AppError as err:
        # Drop anything the service half-did; the reloaded row is ours (ownership checked above).
        await db.rollback()
        reloaded = await db.get(SaarthiAction, action_id)
        assert reloaded is not None
        action = reloaded
        action.status, action.error = ActionStatus.failed, err.message[:300]
        content = f"I couldn't do that: {err.message}"
    else:
        action.status = ActionStatus.pending_approval if outcome.pending else ActionStatus.executed
        action.result = {"message": outcome.message, "href": outcome.href}
        content = outcome.message
    action.decided_at = datetime.now(UTC)
    message = await _reply(db, action, content)
    await db.commit()
    return ActionDecisionOut(action=card(action), message=ChatMessageOut.model_validate(message))


async def cancel(
    db: AsyncSession, member: CurrentMember, action_id: uuid.UUID
) -> ActionDecisionOut:
    action = await _owned(db, member, action_id)
    _require_open(action)
    action.status, action.decided_at = ActionStatus.cancelled, datetime.now(UTC)
    message = await _reply(db, action, CANCELLED_MESSAGE)
    await db.commit()
    return ActionDecisionOut(action=card(action), message=ChatMessageOut.model_validate(message))


async def cards_by_id(db: AsyncSession, ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, Any]]:
    if not ids:
        return {}
    rows = await db.scalars(select(SaarthiAction).where(SaarthiAction.id.in_(ids)))
    return {action.id: card(action) for action in rows}
