import re
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import String, and_, cast, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import Event, EventTicket, Flat, GroupMember
from app.models.enums import (
    EventAudience,
    EventCategory,
    EventListTab,
    EventStatus,
    EventTicketStatus,
    EventType,
    MembershipRole,
)
from app.schemas.event import (
    EventCreate,
    EventDetailOut,
    EventListItemOut,
    EventRsvpIn,
    EventUpdate,
)
from app.schemas.home import HomeEventOut
from app.services import mappers

_COMMITTEE_ROLES = {MembershipRole.committee.value, MembershipRole.admin.value}
_HOST_ONLY_STATUSES = {
    EventStatus.draft,
    EventStatus.pending_approval,
    EventStatus.rejected,
}
_PAST_STATUSES = {EventStatus.published, EventStatus.cancelled, EventStatus.completed}
_LOCKED_STATUSES = {EventStatus.cancelled, EventStatus.completed}


def _slugify(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    base = base[:48] or "event"
    return base


async def _unique_slug(db: AsyncSession, society_id: uuid.UUID, base: str) -> str:
    candidate = base
    suffix = 0
    while True:
        exists = await db.scalar(
            select(Event.id).where(
                Event.society_id == society_id,
                Event.public_slug == candidate,
            )
        )
        if exists is None:
            return candidate
        suffix += 1
        candidate = f"{base}-{suffix}"


def _is_committee(member: CurrentMember) -> bool:
    return member.role in _COMMITTEE_ROLES


async def _member_tower_id(db: AsyncSession, member: CurrentMember) -> uuid.UUID | None:
    if member.flat_id is None:
        return None
    return await db.scalar(select(Flat.tower_id).where(Flat.id == member.flat_id))


def _audience_visible(
    member: CurrentMember,
    tower_id: uuid.UUID | None,
) -> ColumnElement[bool]:
    society_ok = Event.audience_type == EventAudience.society
    group_ok = and_(
        Event.audience_type == EventAudience.group,
        exists(
            select(1).where(
                GroupMember.group_id == Event.audience_group_id,
                GroupMember.user_id == member.user.id,
            )
        ),
    )
    if tower_id is None:
        towers_ok = and_(Event.audience_type == EventAudience.towers, Event.id.is_(None))
    else:
        towers_ok = and_(
            Event.audience_type == EventAudience.towers,
            cast(Event.audience_tower_ids, String).like(f"%{tower_id}%"),
        )
    return or_(society_ok, group_ok, towers_ok, Event.host_id == member.user.id)


def _can_view_event(
    event: Event,
    member: CurrentMember,
    *,
    is_committee: bool,
    tower_id: uuid.UUID | None,
) -> bool:
    is_host = event.host_id == member.user.id
    if event.status in _HOST_ONLY_STATUSES and not (is_host or is_committee):
        return False
    if is_host or is_committee:
        return True
    if event.audience_type == EventAudience.towers:
        return tower_id is not None and tower_id in (event.audience_tower_ids or [])
    # Group membership is checked by the caller; society-wide is visible.
    return True


async def _to_list_item(db: AsyncSession, event: Event, member: CurrentMember) -> EventListItemOut:
    host = await mappers.host_label_for(db, event.host_id)
    going_count = await mappers.going_count_for(db, event.id)
    going = await mappers.public_going_for(db, event.id)
    viewer_going = await mappers.viewer_going_for(db, event.id, member.user.id)
    return mappers.event_to_list_item(
        event,
        host_label=host,
        going_count=going_count,
        going=going,
        viewer_going=viewer_going,
        is_host=event.host_id == member.user.id,
    )


async def list_events(
    db: AsyncSession,
    member: CurrentMember,
    *,
    tab: EventListTab = EventListTab.upcoming,
    event_type: EventType | None = None,
    category: EventCategory | None = None,
    q: str | None = None,
) -> list[EventListItemOut]:
    now = datetime.now(UTC)
    is_committee = _is_committee(member)
    tower_id = await _member_tower_id(db, member)

    stmt = select(Event).where(Event.society_id == member.society_id)
    if not is_committee:
        stmt = stmt.where(_audience_visible(member, tower_id))

    if tab == EventListTab.upcoming:
        live = and_(
            Event.status.in_((EventStatus.published, EventStatus.cancelled)),
            Event.starts_at >= now,
        )
        if is_committee:
            pending = Event.status == EventStatus.pending_approval
        else:
            pending = and_(
                Event.status == EventStatus.pending_approval,
                Event.host_id == member.user.id,
            )
        stmt = stmt.where(or_(live, pending)).order_by(Event.starts_at.asc())
    elif tab == EventListTab.going:
        stmt = (
            stmt.join(EventTicket, EventTicket.event_id == Event.id)
            .where(
                EventTicket.user_id == member.user.id,
                EventTicket.status == EventTicketStatus.confirmed,
                Event.starts_at >= now,
                Event.status.in_((EventStatus.published, EventStatus.cancelled)),
            )
            .order_by(Event.starts_at.asc())
        )
    elif tab == EventListTab.hosting:
        stmt = stmt.where(Event.host_id == member.user.id).order_by(Event.starts_at.desc())
    else:
        stmt = stmt.where(
            Event.ends_at < now,
            Event.status.in_(tuple(_PAST_STATUSES)),
        ).order_by(Event.starts_at.desc())

    if event_type is not None:
        stmt = stmt.where(Event.event_type == event_type)
    if category is not None:
        stmt = stmt.where(Event.category == category)
    needle = (q or "").strip()
    if needle:
        pattern = f"%{needle}%"
        stmt = stmt.where(
            or_(
                Event.title.ilike(pattern),
                Event.description.ilike(pattern),
                cast(Event.tags, String).ilike(pattern),
            )
        )

    events = (await db.execute(stmt.limit(50))).scalars().all()
    return [await _to_list_item(db, event, member) for event in events]


async def get_event_detail(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
) -> EventDetailOut:
    event = await db.scalar(
        select(Event).where(
            Event.society_id == member.society_id,
            Event.public_slug == slug,
        )
    )
    if event is None:
        raise AppError("not_found", "Event not found.", 404)

    is_committee = _is_committee(member)
    is_host = event.host_id == member.user.id
    tower_id = await _member_tower_id(db, member)
    if not _can_view_event(event, member, is_committee=is_committee, tower_id=tower_id):
        raise AppError("not_found", "Event not found.", 404)

    if event.audience_type == EventAudience.group and not (is_host or is_committee):
        member_of_group = await db.scalar(
            select(GroupMember.id).where(
                GroupMember.group_id == event.audience_group_id,
                GroupMember.user_id == member.user.id,
            )
        )
        if member_of_group is None:
            raise AppError("not_found", "Event not found.", 404)

    list_item = await _to_list_item(db, event, member)
    host_profile = await mappers.host_profile_for(db, event)
    attendees = None
    if is_host or is_committee:
        attendees = await mappers.full_attendees_for(db, event.id)
    return mappers.event_to_detail(
        event,
        list_item=list_item,
        host_profile=host_profile,
        attendees=attendees,
        is_committee=is_committee,
        show_rejection=is_host,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _event_window(starts: datetime, ends: datetime | None) -> tuple[datetime, datetime]:
    starts_utc = _as_utc(starts)
    ends_utc = _as_utc(ends) if ends is not None else starts_utc + timedelta(hours=2)
    if ends_utc <= starts_utc:
        raise AppError("validation_error", "End time must be after start time.", 422)
    return starts_utc, ends_utc


async def _event_for_society(db: AsyncSession, member: CurrentMember, slug: str) -> Event:
    event = await db.scalar(
        select(Event).where(
            Event.society_id == member.society_id,
            Event.public_slug == slug,
        )
    )
    if event is None:
        raise AppError("not_found", "Event not found.", 404)
    return event


async def create_event(
    db: AsyncSession,
    member: CurrentMember,
    body: EventCreate,
) -> EventDetailOut:
    if body.event_type != EventType.free:
        raise AppError(
            "validation_error",
            "Only free events can be created right now.",
            422,
        )

    starts, ends = _event_window(body.starts_at, body.ends_at)
    status = EventStatus.draft if body.save_as_draft else EventStatus.published
    slug = await _unique_slug(db, member.society_id, _slugify(body.title))

    event = Event(
        society_id=member.society_id,
        public_slug=slug,
        event_type=body.event_type,
        title=body.title.strip(),
        description=body.description,
        cover_url=body.cover_url,
        host_id=member.user.id,
        location_label=body.location_label.strip(),
        starts_at=starts,
        ends_at=ends,
        capacity=body.capacity,
        price_paise=0,
        status=status,
        tags=body.tags,
        category=body.category,
        guest_limit=body.guest_limit,
        what_to_bring=body.what_to_bring,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return await get_event_detail(db, member, slug)


async def update_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventUpdate,
) -> EventDetailOut:
    event = await _event_for_society(db, member, slug)
    if event.host_id != member.user.id:
        raise AppError("forbidden", "Only the host can edit this event.", 403)
    if event.status in _LOCKED_STATUSES:
        raise AppError("validation_error", "This event can no longer be edited.", 422)

    provided = body.model_fields_set
    was_published = event.status == EventStatus.published
    time_changed = False
    venue_changed = False

    if "title" in provided and body.title is not None:
        event.title = body.title.strip()
    if "location_label" in provided and body.location_label is not None:
        if body.location_label.strip() != (event.location_label or ""):
            venue_changed = True
        event.location_label = body.location_label.strip()
    if "description" in provided:
        event.description = body.description
    if "cover_url" in provided:
        event.cover_url = body.cover_url
    if "category" in provided and body.category is not None:
        event.category = body.category
    if "tags" in provided and body.tags is not None:
        event.tags = body.tags
    if "what_to_bring" in provided:
        event.what_to_bring = body.what_to_bring
    if "guest_limit" in provided and body.guest_limit is not None:
        event.guest_limit = body.guest_limit
    if "capacity" in provided and body.capacity is not None:
        going = await mappers.going_count_for(db, event.id)
        if body.capacity < going:
            raise AppError(
                "validation_error",
                "Capacity cannot be below the number of people going.",
                422,
            )
        event.capacity = body.capacity

    next_starts = event.starts_at
    next_ends = event.ends_at
    if "starts_at" in provided and body.starts_at is not None:
        next_starts = body.starts_at
    if "ends_at" in provided:
        next_ends = body.ends_at
    if "starts_at" in provided or "ends_at" in provided:
        starts, ends = _event_window(next_starts, next_ends)
        if starts != _as_utc(event.starts_at) or ends != _as_utc(event.ends_at):
            time_changed = True
        event.starts_at = starts
        event.ends_at = ends

    if body.publish:
        if event.event_type != EventType.free:
            raise AppError(
                "validation_error",
                "Only free events can be published right now.",
                422,
            )
        event.status = EventStatus.published

    if was_published and (time_changed or venue_changed):
        if time_changed and venue_changed:
            event.change_summary = "Time and venue changed"
        elif time_changed:
            event.change_summary = "Time changed"
        else:
            event.change_summary = "Venue changed"
        event.changed_at = datetime.now(UTC)

    await db.commit()
    return await get_event_detail(db, member, slug)


async def rsvp_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventRsvpIn,
) -> HomeEventOut:
    event = await db.scalar(
        select(Event).where(
            Event.society_id == member.society_id,
            Event.public_slug == slug,
            Event.status == EventStatus.published,
        )
    )
    if event is None:
        raise AppError("not_found", "Event not found.", 404)

    if event.event_type == EventType.paid and event.price_paise > 0:
        raise AppError("payment_required", "Paid events are not bookable yet.", 400)

    going = await mappers.going_count_for(db, event.id)
    existing = await db.scalar(
        select(EventTicket).where(
            EventTicket.event_id == event.id,
            EventTicket.user_id == member.user.id,
        )
    )
    if existing is not None and existing.status == EventTicketStatus.confirmed:
        return await _event_out(db, event)

    if going + body.qty > event.capacity:
        raise AppError("capacity_full", "This event is full.", 409)

    if existing is not None:
        existing.status = EventTicketStatus.confirmed
        existing.qty = body.qty
        existing.amount_paise = 0
    else:
        db.add(
            EventTicket(
                event_id=event.id,
                society_id=member.society_id,
                user_id=member.user.id,
                qty=body.qty,
                amount_paise=0,
                status=EventTicketStatus.confirmed,
            )
        )
    await db.commit()
    return await _event_out(db, event)


async def leave_event(db: AsyncSession, member: CurrentMember, slug: str) -> HomeEventOut:
    event = await db.scalar(
        select(Event).where(
            Event.society_id == member.society_id,
            Event.public_slug == slug,
        )
    )
    if event is None:
        raise AppError("not_found", "Event not found.", 404)

    ticket = await db.scalar(
        select(EventTicket).where(
            EventTicket.event_id == event.id,
            EventTicket.user_id == member.user.id,
            EventTicket.status == EventTicketStatus.confirmed,
        )
    )
    if ticket is not None:
        ticket.status = EventTicketStatus.cancelled
        await db.commit()
    return await _event_out(db, event)


async def _event_out(db: AsyncSession, event: Event) -> HomeEventOut:
    host = await mappers.host_label_for(db, event.host_id)
    going = await mappers.going_count_for(db, event.id)
    people = await mappers.public_going_for(db, event.id)
    return mappers.event_to_home_event(event, host_label=host, going_count=going, going=people)
