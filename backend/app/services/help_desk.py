"""Help desk issues, vendors and feedback. Shared by the app screens and Saarthi."""

import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import (
    Feedback,
    Flat,
    Ticket,
    TicketFollower,
    TicketUpdate,
    Tower,
    User,
    Vendor,
)
from app.models.enums import ActorRole, TicketScope, TicketStatus, TicketUpdateKind
from app.schemas.flat_opening import TowerOut
from app.schemas.help_desk import (
    CommentIn,
    ConfirmationIn,
    FeedbackIn,
    FeedbackOut,
    IssueIn,
    IssueOut,
    StatusIn,
    TimelineEntryOut,
    VendorOut,
)
from app.services import notifications
from app.services.marketplace import is_committee
from app.services.people import short_name

FIRST_TICKET_NUMBER = 1001


def _now() -> datetime:
    # Set in Python: SQLite's server-side now() only has second precision, which breaks ordering.
    return datetime.now(UTC)
ACTIVE = (TicketStatus.open, TicketStatus.in_progress)
STATUS_LABEL = {
    TicketStatus.open: "Reopened",
    TicketStatus.in_progress: "In progress",
    TicketStatus.resolved: "Resolved",
    TicketStatus.closed: "Closed",
}


async def member_tower_id(db: AsyncSession, member: CurrentMember) -> uuid.UUID | None:
    if member.flat_id is None:
        return None
    return await db.scalar(
        select(Flat.tower_id).where(Flat.id == member.flat_id, Flat.society_id == member.society_id)
    )


def _followed_by(member: CurrentMember) -> Any:
    return select(TicketFollower.ticket_id).where(
        TicketFollower.society_id == member.society_id,
        TicketFollower.user_id == member.user.id,
    )


def _visible(member: CurrentMember) -> Any:
    """Common-area issues are society-wide; flat issues reach only followers and the committee.

    Residents use every tower's lifts and lobbies, so anyone may add "Me too" to them.
    """
    if is_committee(member):
        return true()
    return or_(Ticket.scope == TicketScope.common_area, Ticket.id.in_(_followed_by(member)))


async def _to_out(db: AsyncSession, tickets: list[Ticket]) -> list[IssueOut]:
    if not tickets:
        return []
    ids = [t.id for t in tickets]
    tower_rows = await db.execute(
        select(Tower.id, Tower.name).where(Tower.id.in_({t.tower_id for t in tickets}))
    )
    towers = dict(tower_rows.all())
    followers: dict[uuid.UUID, list[str]] = defaultdict(list)
    for ticket_id, user_id in await db.execute(
        select(TicketFollower.ticket_id, TicketFollower.user_id)
        .where(TicketFollower.ticket_id.in_(ids))
        .order_by(TicketFollower.created_at)
    ):
        followers[ticket_id].append(str(user_id))
    updates: dict[uuid.UUID, list[TimelineEntryOut]] = defaultdict(list)
    rows = await db.execute(
        select(TicketUpdate, User)
        .join(User, User.id == TicketUpdate.actor_id, isouter=True)
        .where(TicketUpdate.ticket_id.in_(ids))
        .order_by(TicketUpdate.created_at.desc())
    )
    for update, actor in rows:
        updates[update.ticket_id].append(
            TimelineEntryOut(
                id=update.id,
                kind=update.kind,
                at=update.created_at,
                actor_name="Committee" if update.actor_role == ActorRole.committee
                else short_name(actor),
                actor_role=update.actor_role,
                message=update.message,
            )
        )
    return [
        IssueOut(
            id=t.id,
            number=f"HD-{t.number:04d}",
            title=t.title,
            description=t.description,
            category=t.category,
            scope=t.scope,
            tower=towers.get(t.tower_id, ""),
            tower_id=t.tower_id,
            area_label=t.area_label,
            urgency=t.urgency,
            status=t.status,
            created_at=t.created_at,
            reporter_ids=[str(t.reporter_id)],
            reporter_emails=[],
            follower_ids=followers[t.id],
            reporter_count=len(followers[t.id]),
            photo_urls=t.photo_urls,
            assigned_vendor_id=t.assigned_vendor_id,
            timeline=updates[t.id],
            awaiting_confirmation=t.awaiting_confirmation,
        )
        for t in tickets
    ]


async def list_issues(db: AsyncSession, member: CurrentMember) -> list[IssueOut]:
    tickets = await db.scalars(
        select(Ticket)
        .where(Ticket.society_id == member.society_id, _visible(member))
        .order_by(Ticket.created_at.desc())
    )
    return await _to_out(db, list(tickets))


async def _load(db: AsyncSession, member: CurrentMember, issue_id: uuid.UUID) -> Ticket:
    ticket = await db.scalar(
        select(Ticket).where(
            Ticket.id == issue_id,
            Ticket.society_id == member.society_id,
            _visible(member),
        )
    )
    if ticket is None:
        raise AppError("not_found", "Issue not found.", 404)
    return ticket


async def get_issue(db: AsyncSession, member: CurrentMember, issue_id: uuid.UUID) -> IssueOut:
    return (await _to_out(db, [await _load(db, member, issue_id)]))[0]


async def _is_follower(db: AsyncSession, ticket: Ticket, user_id: uuid.UUID) -> bool:
    found = await db.scalar(
        select(TicketFollower.id).where(
            TicketFollower.ticket_id == ticket.id, TicketFollower.user_id == user_id
        )
    )
    return found is not None


def _follow(db: AsyncSession, ticket: Ticket, member: CurrentMember) -> None:
    db.add(
        TicketFollower(
            society_id=ticket.society_id,
            ticket_id=ticket.id,
            user_id=member.user.id,
            created_at=_now(),
        )
    )


def _log(
    db: AsyncSession, ticket: Ticket, member: CurrentMember, kind: TicketUpdateKind, message: str
) -> None:
    db.add(
        TicketUpdate(
            society_id=ticket.society_id,
            ticket_id=ticket.id,
            kind=kind,
            actor_id=member.user.id,
            actor_role=ActorRole.committee if is_committee(member) else ActorRole.resident,
            message=message,
            created_at=_now(),
        )
    )


async def create_issue(db: AsyncSession, member: CurrentMember, body: IssueIn) -> IssueOut:
    if body.scope == TicketScope.my_flat:
        tower_id = await member_tower_id(db, member)
        if tower_id is None:
            raise AppError("no_flat", "Add your flat to your profile to report a flat issue.", 422)
    else:
        tower_id = await db.scalar(
            select(Tower.id).where(Tower.id == body.tower_id, Tower.society_id == member.society_id)
        )
        if tower_id is None:
            raise AppError("invalid_tower", "Choose a tower in your society.", 422)
    last = await db.scalar(
        select(func.max(Ticket.number)).where(Ticket.society_id == member.society_id)
    )
    ticket = Ticket(
        society_id=member.society_id,
        number=(last or FIRST_TICKET_NUMBER - 1) + 1,
        title=body.title,
        description=body.description,
        category=body.category,
        scope=body.scope,
        tower_id=tower_id,
        area_label=body.area_label,
        urgency=body.urgency,
        reporter_id=member.user.id,
        created_at=_now(),
    )
    db.add(ticket)
    await db.flush()
    _follow(db, ticket, member)
    _log(db, ticket, member, TicketUpdateKind.created, "Reported the issue.")
    await db.commit()
    return await get_issue(db, member, ticket.id)


async def me_too(db: AsyncSession, member: CurrentMember, issue_id: uuid.UUID) -> IssueOut:
    """Adds the resident to an open common-area issue instead of filing a duplicate."""
    ticket = await _load(db, member, issue_id)
    if ticket.scope != TicketScope.common_area:
        raise AppError("not_shared", "Only common-area issues can be joined.", 422)
    if ticket.status not in ACTIVE:
        raise AppError("issue_closed", "This issue is no longer open.", 422)
    if not await _is_follower(db, ticket, member.user.id):
        _follow(db, ticket, member)
        await db.commit()
    return await get_issue(db, member, issue_id)


async def add_comment(
    db: AsyncSession, member: CurrentMember, issue_id: uuid.UUID, body: CommentIn
) -> IssueOut:
    ticket = await _load(db, member, issue_id)
    if not is_committee(member) and not await _is_follower(db, ticket, member.user.id):
        raise AppError("forbidden", "Add yourself to this issue to comment on it.", 403)
    _log(db, ticket, member, TicketUpdateKind.comment, body.message)
    await db.commit()
    return await get_issue(db, member, issue_id)


async def confirm_fixed(
    db: AsyncSession, member: CurrentMember, issue_id: uuid.UUID, body: ConfirmationIn
) -> IssueOut:
    ticket = await _load(db, member, issue_id)
    if not await _is_follower(db, ticket, member.user.id):
        raise AppError("forbidden", "Only residents on this issue can confirm it.", 403)
    if ticket.status != TicketStatus.resolved:
        raise AppError("not_resolved", "This issue hasn't been marked resolved yet.", 422)
    ticket.awaiting_confirmation = False
    if body.fixed:
        ticket.status = TicketStatus.closed
        message = "Confirmed the issue is fixed."
    else:
        ticket.status = TicketStatus.open
        message = f"Reopened: {body.note or 'Still not resolved.'}"
    _log(db, ticket, member, TicketUpdateKind.status, message)
    await db.commit()
    return await get_issue(db, member, issue_id)


async def update_status(
    db: AsyncSession, member: CurrentMember, issue_id: uuid.UUID, body: StatusIn
) -> IssueOut:
    if not is_committee(member):
        raise AppError("forbidden", "Only the committee can do this.", 403)
    ticket = await _load(db, member, issue_id)
    if body.vendor_id is not None:
        vendor = await db.scalar(
            select(Vendor).where(
                Vendor.id == body.vendor_id, Vendor.society_id == member.society_id
            )
        )
        if vendor is None:
            raise AppError("invalid_vendor", "Choose a vendor from the directory.", 422)
        ticket.assigned_vendor_id = vendor.id
        _log(db, ticket, member, TicketUpdateKind.vendor, f"Assigned to {vendor.name}.")
    if body.note:
        _log(db, ticket, member, TicketUpdateKind.committee_note, body.note)
    if body.status != ticket.status:
        ticket.status = body.status
        ticket.awaiting_confirmation = body.status == TicketStatus.resolved
        ticket.resolved_at = _now() if body.status == TicketStatus.resolved else None
        label = STATUS_LABEL[body.status]
        _log(db, ticket, member, TicketUpdateKind.status, f"Marked {label.lower()}.")
        followers = await db.scalars(
            select(TicketFollower.user_id).where(
                TicketFollower.ticket_id == ticket.id, TicketFollower.user_id != member.user.id
            )
        )
        ask = " Was it fixed? Let us know." if body.status == TicketStatus.resolved else ""
        notifications.add_notifications(
            db,
            member.society_id,
            list(followers),
            kind="help_desk",
            title=f"HD-{ticket.number:04d}: {label}",
            body=f"{ticket.title}.{ask}",
            href=f"/help-desk/tickets/{ticket.id}",
        )
    await db.commit()
    return await get_issue(db, member, issue_id)


async def list_towers(db: AsyncSession, member: CurrentMember) -> list[TowerOut]:
    towers = await db.scalars(
        select(Tower).where(Tower.society_id == member.society_id).order_by(Tower.name)
    )
    return [TowerOut(id=t.id, name=t.name) for t in towers]


async def list_vendors(db: AsyncSession, member: CurrentMember) -> list[VendorOut]:
    vendors = await db.scalars(
        select(Vendor)
        .where(Vendor.society_id == member.society_id)
        .order_by(Vendor.category, Vendor.name)
    )
    return [VendorOut.model_validate(v) for v in vendors]


async def submit_feedback(db: AsyncSession, member: CurrentMember, body: FeedbackIn) -> FeedbackOut:
    feedback = Feedback(
        society_id=member.society_id,
        user_id=None if body.anonymous else member.user.id,
        topic=body.topic,
        message=body.message,
        anonymous=body.anonymous,
        created_at=_now(),
    )
    db.add(feedback)
    await db.commit()
    return _feedback_out(feedback, None if body.anonymous else member.user)


def _feedback_out(feedback: Feedback, author: User | None) -> FeedbackOut:
    return FeedbackOut(
        id=feedback.id,
        topic=feedback.topic,
        message=feedback.message,
        anonymous=feedback.anonymous,
        author_name=None if feedback.anonymous else short_name(author),
        created_at=feedback.created_at,
        read=feedback.read_at is not None,
    )


async def list_feedback(db: AsyncSession, member: CurrentMember) -> list[FeedbackOut]:
    if not is_committee(member):
        raise AppError("forbidden", "Only the committee can do this.", 403)
    rows = await db.execute(
        select(Feedback, User)
        .join(User, User.id == Feedback.user_id, isouter=True)
        .where(Feedback.society_id == member.society_id)
        .order_by(Feedback.created_at.desc())
    )
    return [_feedback_out(feedback, author) for feedback, author in rows]
