import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import StallApplication
from app.models.enums import EventType, StallApplicationStatus
from app.schemas.event import EventDetailOut, StallApplyIn, StallApproveIn
from app.services import mappers
from app.services.events import (
    _as_utc,
    _event_for_society,
    _published_event,
    _require_committee,
    get_event_detail,
)

_ACTIVE = {
    StallApplicationStatus.pending,
    StallApplicationStatus.approved,
    StallApplicationStatus.paid,
}
_HELD = {StallApplicationStatus.approved, StallApplicationStatus.paid}


async def _active_count(
    db: AsyncSession,
    event_id: uuid.UUID,
    *,
    stall_type: str | None = None,
) -> int:
    stmt = select(func.count()).select_from(StallApplication).where(
        StallApplication.event_id == event_id,
        StallApplication.status.in_(tuple(_ACTIVE)),
    )
    if stall_type is not None:
        stmt = stmt.where(func.lower(StallApplication.stall_type) == stall_type.casefold())
    return int(await db.scalar(stmt) or 0)


async def apply_stall(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: StallApplyIn,
) -> EventDetailOut:
    event = await _published_event(db, member, slug)
    if event.event_type != EventType.society or not event.stalls_enabled:
        raise AppError("validation_error", "This event is not taking stall applications.", 422)

    now = datetime.now(UTC)
    if now >= _as_utc(event.starts_at):
        raise AppError("validation_error", "This event has already started.", 422)
    deadline = event.stall_application_deadline
    if deadline is not None and now >= _as_utc(deadline):
        raise AppError("validation_error", "Stall applications have closed.", 422)

    existing = await db.scalar(
        select(StallApplication.id).where(
            StallApplication.event_id == event.id,
            StallApplication.user_id == member.user.id,
            StallApplication.status.in_(tuple(_ACTIVE)),
        )
    )
    if existing is not None:
        raise AppError("conflict", "You already have a stall application for this event.", 409)

    stall_type = body.stall_type
    categories = mappers.parse_stall_categories(event.stall_categories)
    if categories:
        match = next(
            (item for item in categories if item.name.casefold() == stall_type.casefold()),
            None,
        )
        if match is None:
            raise AppError("validation_error", "Pick a stall type from the list.", 422)
        stall_type = match.name
        if match.limit is not None:
            taken = await _active_count(db, event.id, stall_type=stall_type)
            if taken >= match.limit:
                raise AppError("validation_error", f"{match.name} stalls are full.", 422)

    if event.stall_count is not None and await _active_count(db, event.id) >= event.stall_count:
        raise AppError("validation_error", "All stalls have been taken.", 422)

    db.add(
        StallApplication(
            event_id=event.id,
            society_id=member.society_id,
            user_id=member.user.id,
            stall_type=stall_type,
            description=body.description,
            fee_paise=event.stall_fee_paise,
            status=StallApplicationStatus.pending,
        )
    )
    await db.commit()
    return await get_event_detail(db, member, slug)


async def _application_for_event(
    db: AsyncSession,
    event_id: uuid.UUID,
    society_id: uuid.UUID,
    application_id: uuid.UUID,
) -> StallApplication:
    application = await db.scalar(
        select(StallApplication).where(
            StallApplication.id == application_id,
            StallApplication.event_id == event_id,
            StallApplication.society_id == society_id,
        )
    )
    if application is None:
        raise AppError("not_found", "Stall application not found.", 404)
    return application


async def approve_stall(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    application_id: uuid.UUID,
    body: StallApproveIn,
) -> EventDetailOut:
    _require_committee(member)
    event = await _event_for_society(db, member, slug)
    application = await _application_for_event(db, event.id, member.society_id, application_id)
    if application.status != StallApplicationStatus.pending:
        raise AppError("validation_error", "Only pending applications can be approved.", 422)

    taken = await db.scalar(
        select(StallApplication.id).where(
            StallApplication.event_id == event.id,
            StallApplication.id != application.id,
            StallApplication.status.in_(tuple(_HELD)),
            func.lower(StallApplication.spot_no) == body.spot_no.casefold(),
        )
    )
    if taken is not None:
        raise AppError("validation_error", "That stall spot is already assigned.", 422)

    application.status = StallApplicationStatus.approved
    application.spot_no = body.spot_no
    await db.commit()
    return await get_event_detail(db, member, slug)


async def reject_stall(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    application_id: uuid.UUID,
) -> EventDetailOut:
    _require_committee(member)
    event = await _event_for_society(db, member, slug)
    application = await _application_for_event(db, event.id, member.society_id, application_id)
    if application.status != StallApplicationStatus.pending:
        raise AppError("validation_error", "Only pending applications can be rejected.", 422)
    application.status = StallApplicationStatus.rejected
    application.spot_no = None
    await db.commit()
    return await get_event_detail(db, member, slug)
