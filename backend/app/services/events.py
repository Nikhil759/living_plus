import re
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import String, and_, cast, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import Event, EventTicket, EventWaitlist, Flat, GroupMember
from app.models.enums import (
    EventAudience,
    EventCategory,
    EventListTab,
    EventRecurrence,
    EventStatus,
    EventTicketStatus,
    EventType,
    MembershipRole,
)
from app.schemas.event import (
    EventCancelIn,
    EventCreate,
    EventDetailOut,
    EventListItemOut,
    EventRejectIn,
    EventRsvpIn,
    EventUpdate,
    StallCategoryIn,
)
from app.schemas.home import HomeEventOut
from app.services import amenities as amenity_service
from app.services import community, event_series, mappers, notifications

_COMMITTEE_ROLES = {MembershipRole.committee.value, MembershipRole.admin.value}
_HOST_ONLY_STATUSES = {
    EventStatus.draft,
    EventStatus.pending_approval,
    EventStatus.rejected,
}
_PAST_STATUSES = {EventStatus.published, EventStatus.cancelled, EventStatus.completed}
_LOCKED_STATUSES = {EventStatus.cancelled, EventStatus.completed}
_APPROVAL_TYPES = {EventType.paid, EventType.society}
# Messaging more than this many residents at once needs committee approval (PRODUCT.md).
INVITE_APPROVAL_LIMIT = 10
_IST = ZoneInfo("Asia/Kolkata")
# Demo unlocks paid hosting for every member. Flip off to enforce Plus.
_PLUS_UNLOCKED = True


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


def _needs_approval(event_type: EventType) -> bool:
    return event_type in _APPROVAL_TYPES


def _can_host_paid(member: CurrentMember) -> bool:
    return _PLUS_UNLOCKED or _is_committee(member)


def _submit_status(event_type: EventType) -> EventStatus:
    if _needs_approval(event_type):
        return EventStatus.pending_approval
    return EventStatus.published


def _price_paise(event_type: EventType, price_inr: int | None) -> int:
    if event_type != EventType.paid:
        return 0
    if price_inr is None:
        raise AppError("validation_error", "Paid events need a ticket price.", 422)
    return price_inr * 100


_STALL_UPDATE_FIELDS = {
    "stalls_enabled",
    "stall_count",
    "stall_fee_inr",
    "stall_categories",
    "stall_application_deadline",
}


def _stall_config(
    event_type: EventType,
    *,
    enabled: bool,
    count: int | None,
    fee_inr: int | None,
    categories: list[StallCategoryIn],
    deadline: datetime | None,
    starts_at: datetime,
) -> dict[str, object]:
    if event_type != EventType.society:
        if enabled:
            raise AppError("validation_error", "Stalls are only for society events.", 422)
        return {
            "stalls_enabled": False,
            "stall_count": None,
            "stall_fee_paise": 0,
            "stall_categories": [],
            "stall_application_deadline": None,
        }
    if not enabled:
        return {
            "stalls_enabled": False,
            "stall_count": None,
            "stall_fee_paise": 0,
            "stall_categories": [],
            "stall_application_deadline": None,
        }
    deadline_utc = _as_utc(deadline) if deadline is not None else None
    starts_utc = _as_utc(starts_at)
    if deadline_utc is not None and deadline_utc >= starts_utc:
        raise AppError(
            "validation_error",
            "Stall applications must close before the event starts.",
            422,
        )
    seen: set[str] = set()
    cats: list[dict[str, object]] = []
    for category in categories:
        key = category.name.casefold()
        if key in seen:
            raise AppError("validation_error", "Stall types must be unique.", 422)
        seen.add(key)
        cats.append({"name": category.name, "limit": category.limit})
    return {
        "stalls_enabled": True,
        "stall_count": count or 10,
        "stall_fee_paise": (fee_inr or 0) * 100,
        "stall_categories": cats,
        "stall_application_deadline": deadline_utc,
    }


def _require_committee(member: CurrentMember) -> None:
    if not _is_committee(member):
        raise AppError("forbidden", "Only the committee can do this.", 403)


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
    viewer_qty = await mappers.viewer_rsvp_qty(db, event.id, member.user.id)
    wait_qty = await mappers.viewer_waitlist_qty(db, event.id, member.user.id)
    party = viewer_qty or wait_qty
    return mappers.event_to_list_item(
        event,
        host_label=host,
        going_count=going_count,
        going=going,
        viewer_going=viewer_qty > 0,
        is_host=event.host_id == member.user.id,
        viewer_guest_count=max(party - 1, 0),
        viewer_waitlisted=wait_qty > 0,
        waitlist_count=await mappers.waitlist_count_for(db, event.id),
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
    stall_apps = await mappers.stall_applications_for(db, event.id)
    viewer_id = str(member.user.id)
    viewer_stall = next((app for app in stall_apps if app.applicant_id == viewer_id), None)
    return mappers.event_to_detail(
        event,
        list_item=list_item,
        host_profile=host_profile,
        attendees=attendees,
        is_committee=is_committee,
        show_rejection=is_host or is_committee,
        viewer_stall=viewer_stall,
        stall_applications=stall_apps if (is_host or is_committee) else None,
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


async def _require_host_or_committee(
    db: AsyncSession, member: CurrentMember, slug: str
) -> Event:
    event = await _event_for_society(db, member, slug)
    if event.host_id != member.user.id and not _is_committee(member):
        raise AppError("forbidden", "Only the host or committee can manage this event.", 403)
    return event


async def _expand_series(db: AsyncSession, event: Event) -> None:
    if event.recurrence == EventRecurrence.none:
        return
    if event.series_id is not None:
        already = await db.scalar(
            select(Event.id).where(
                Event.series_id == event.series_id,
                Event.id != event.id,
            )
        )
        if already is not None:
            return

    windows = event_series.series_windows(
        _as_utc(event.starts_at),
        _as_utc(event.ends_at),
        event.recurrence,
        count=event.recurrence_count,
        ends_on=event.recurrence_ends_on,
    )
    if len(windows) < 2:
        return

    series_id = event.series_id or uuid.uuid4()
    event.series_id = series_id
    event.occurrence_index = 0
    await db.flush()
    for index, (starts, ends) in enumerate(windows[1:], start=1):
        slug = await _unique_slug(db, event.society_id, _slugify(event.title))
        db.add(
            Event(
                society_id=event.society_id,
                public_slug=slug,
                event_type=event.event_type,
                title=event.title,
                description=event.description,
                cover_url=event.cover_url,
                host_id=event.host_id,
                amenity_id=event.amenity_id,
                location_label=event.location_label,
                starts_at=starts,
                ends_at=ends,
                capacity=event.capacity,
                price_paise=event.price_paise,
                status=event.status,
                tags=list(event.tags or []),
                category=event.category,
                guest_limit=event.guest_limit,
                what_to_bring=event.what_to_bring,
                audience_type=event.audience_type,
                audience_group_id=event.audience_group_id,
                audience_tower_ids=list(event.audience_tower_ids or []),
                recurrence=event.recurrence,
                recurrence_count=event.recurrence_count,
                recurrence_ends_on=event.recurrence_ends_on,
                series_id=series_id,
                occurrence_index=index,
                stalls_enabled=event.stalls_enabled,
                stall_count=event.stall_count,
                stall_fee_paise=event.stall_fee_paise,
                stall_categories=list(event.stall_categories or []),
                stall_application_deadline=event.stall_application_deadline,
            )
        )
        await db.flush()


async def create_event(
    db: AsyncSession,
    member: CurrentMember,
    body: EventCreate,
) -> EventDetailOut:
    if body.event_type == EventType.society and not _is_committee(member):
        raise AppError("forbidden", "Only the committee can host society events.", 403)
    if body.event_type == EventType.paid and not _can_host_paid(member):
        raise AppError(
            "forbidden",
            "Hosting paid events is a Plus feature.",
            403,
        )

    space_needs_approval = False
    if body.amenity_id is not None:
        # 404s for anything outside the member's own society.
        amenity, _ = await amenity_service.load_amenity(db, member, body.amenity_id)
        # Hall and amphitheatre events need the committee (Handbook §12).
        space_needs_approval = bool((amenity.rules or {}).get("requires_approval"))
    invitees = (
        await community.residents_with_interest(
            db, member.society_id, body.invite_interest, exclude=member.user.id
        )
        if body.invite_interest
        else []
    )

    starts, ends = _event_window(body.starts_at, body.ends_at)
    if body.save_as_draft:
        status = EventStatus.draft
    elif space_needs_approval or len(invitees) > INVITE_APPROVAL_LIMIT:
        status = EventStatus.pending_approval
    else:
        status = _submit_status(body.event_type)
    slug = await _unique_slug(db, member.society_id, _slugify(body.title))
    stalls = _stall_config(
        body.event_type,
        enabled=body.stalls_enabled,
        count=body.stall_count,
        fee_inr=body.stall_fee_inr,
        categories=body.stall_categories,
        deadline=body.stall_application_deadline,
        starts_at=starts,
    )

    event = Event(
        society_id=member.society_id,
        public_slug=slug,
        event_type=body.event_type,
        title=body.title.strip(),
        description=body.description,
        cover_url=body.cover_url,
        host_id=member.user.id,
        amenity_id=body.amenity_id,
        location_label=body.location_label.strip(),
        invite_interest=body.invite_interest,
        starts_at=starts,
        ends_at=ends,
        capacity=body.capacity,
        price_paise=_price_paise(body.event_type, body.price_inr),
        status=status,
        tags=body.tags,
        category=body.category,
        guest_limit=body.guest_limit,
        what_to_bring=body.what_to_bring,
        recurrence=body.recurrence,
        recurrence_count=body.recurrence_count,
        recurrence_ends_on=body.recurrence_ends_on,
        **stalls,
    )
    db.add(event)
    await db.flush()
    if status == EventStatus.published:
        await _expand_series(db, event)
        await _send_invites(db, event)
    await db.commit()
    await db.refresh(event)
    return await get_event_detail(db, member, slug)


async def update_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventUpdate,
) -> EventDetailOut:
    event = await _require_host_or_committee(db, member, slug)
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
        await _promote_waitlist(db, event)
    if "price_inr" in provided:
        going = await mappers.going_count_for(db, event.id)
        if going > 0:
            raise AppError(
                "validation_error",
                "Price cannot change after someone has booked.",
                422,
            )
        event.price_paise = _price_paise(event.event_type, body.price_inr)

    if provided & _STALL_UPDATE_FIELDS:
        current_cats = mappers.parse_stall_categories(event.stall_categories)
        stalls = _stall_config(
            event.event_type,
            enabled=body.stalls_enabled if "stalls_enabled" in provided else event.stalls_enabled,
            count=body.stall_count if "stall_count" in provided else event.stall_count,
            fee_inr=(
                body.stall_fee_inr
                if "stall_fee_inr" in provided
                else event.stall_fee_paise // 100
            ),
            categories=(
                body.stall_categories
                if "stall_categories" in provided and body.stall_categories is not None
                else [
                    StallCategoryIn(name=item.name, limit=item.limit) for item in current_cats
                ]
            ),
            deadline=(
                body.stall_application_deadline
                if "stall_application_deadline" in provided
                else event.stall_application_deadline
            ),
            starts_at=event.starts_at,
        )
        event.stalls_enabled = bool(stalls["stalls_enabled"])
        event.stall_count = stalls["stall_count"]  # type: ignore[assignment]
        event.stall_fee_paise = int(stalls["stall_fee_paise"])
        event.stall_categories = stalls["stall_categories"]  # type: ignore[assignment]
        event.stall_application_deadline = stalls["stall_application_deadline"]  # type: ignore[assignment]

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
        event.status = _submit_status(event.event_type)
        if event.status == EventStatus.pending_approval:
            event.rejection_reason = None
        if event.status == EventStatus.published:
            await _expand_series(db, event)

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


async def _close_occurrence(db: AsyncSession, event: Event, reason: str) -> None:
    if event.status in _LOCKED_STATUSES:
        return
    event.status = EventStatus.cancelled
    event.cancel_reason = reason
    tickets = (
        await db.scalars(
            select(EventTicket).where(
                EventTicket.event_id == event.id,
                EventTicket.status == EventTicketStatus.confirmed,
            )
        )
    ).all()
    for ticket in tickets:
        ticket.status = EventTicketStatus.cancelled
    waiting = (
        await db.scalars(select(EventWaitlist).where(EventWaitlist.event_id == event.id))
    ).all()
    for entry in waiting:
        await db.delete(entry)


async def cancel_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventCancelIn,
) -> EventDetailOut:
    event = await _require_host_or_committee(db, member, slug)
    if event.status in _LOCKED_STATUSES:
        raise AppError("validation_error", "This event is already closed.", 422)

    targets = [event]
    if body.scope == "series":
        if event.series_id is None:
            raise AppError("validation_error", "This event is not part of a series.", 422)
        targets = (
            await db.scalars(
                select(Event).where(
                    Event.society_id == member.society_id,
                    Event.series_id == event.series_id,
                    Event.starts_at >= event.starts_at,
                    ~Event.status.in_(tuple(_LOCKED_STATUSES)),
                )
            )
        ).all()
    for item in targets:
        await _close_occurrence(db, item, body.reason)
    await db.commit()
    return await get_event_detail(db, member, slug)


def _notify_host(db: AsyncSession, event: Event, outcome: str, body: str) -> None:
    notifications.add_notifications(
        db,
        event.society_id,
        [event.host_id],
        kind="event_review",
        title=f"{event.title}: {outcome}",
        body=body,
        href=f"/events/{event.public_slug}",
    )


async def _send_invites(db: AsyncSession, event: Event) -> None:
    """Invites residents who share the event's interest once it is published."""
    if not event.invite_interest:
        return
    invitees = await community.residents_with_interest(
        db, event.society_id, event.invite_interest, exclude=event.host_id
    )
    local = event.starts_at.astimezone(_IST)
    when = f"{local:%a} {local.day} {local:%b}, {local:%I:%M %p}".replace(" 0", " ")
    notifications.add_notifications(
        db,
        event.society_id,
        invitees,
        kind="event_invite",
        title=f"You're invited: {event.title}",
        body=f"{when} · {event.location_label}. For residents who like {event.invite_interest}.",
        href=f"/events/{event.public_slug}",
    )


async def approve_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
) -> EventDetailOut:
    _require_committee(member)
    event = await _event_for_society(db, member, slug)
    if event.status != EventStatus.pending_approval:
        raise AppError("validation_error", "Only pending events can be approved.", 422)
    event.status = EventStatus.published
    event.rejection_reason = None
    await _expand_series(db, event)
    _notify_host(db, event, "approved", "It's published and residents can RSVP now.")
    await _send_invites(db, event)
    await db.commit()
    return await get_event_detail(db, member, slug)


async def reject_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventRejectIn,
) -> EventDetailOut:
    _require_committee(member)
    event = await _event_for_society(db, member, slug)
    if event.status != EventStatus.pending_approval:
        raise AppError("validation_error", "Only pending events can be rejected.", 422)
    event.status = EventStatus.rejected
    event.rejection_reason = body.reason
    _notify_host(db, event, "not approved", f"Reason: {body.reason}")
    await db.commit()
    return await get_event_detail(db, member, slug)


async def duplicate_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
) -> EventDetailOut:
    event = await _require_host_or_committee(db, member, slug)
    copy_slug = await _unique_slug(db, member.society_id, _slugify(event.title))
    copy = Event(
        society_id=member.society_id,
        public_slug=copy_slug,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        cover_url=event.cover_url,
        host_id=member.user.id,
        amenity_id=event.amenity_id,
        location_label=event.location_label,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        capacity=event.capacity,
        price_paise=0 if event.event_type == EventType.free else event.price_paise,
        status=EventStatus.draft,
        tags=list(event.tags or []),
        category=event.category,
        guest_limit=event.guest_limit,
        what_to_bring=event.what_to_bring,
        audience_type=event.audience_type,
        audience_group_id=event.audience_group_id,
        audience_tower_ids=list(event.audience_tower_ids or []),
        stalls_enabled=event.stalls_enabled,
        stall_count=event.stall_count,
        stall_fee_paise=event.stall_fee_paise,
        stall_categories=list(event.stall_categories or []),
        stall_application_deadline=event.stall_application_deadline,
    )
    db.add(copy)
    await db.commit()
    await db.refresh(copy)
    return await get_event_detail(db, member, copy_slug)


async def _published_event(db: AsyncSession, member: CurrentMember, slug: str) -> Event:
    event = await db.scalar(
        select(Event).where(
            Event.society_id == member.society_id,
            Event.public_slug == slug,
            Event.status == EventStatus.published,
        )
    )
    if event is None:
        raise AppError("not_found", "Event not found.", 404)
    return event


def _assert_guest_qty(event: Event, qty: int) -> None:
    if qty - 1 > event.guest_limit:
        raise AppError(
            "validation_error",
            "This event allows fewer guests than that.",
            422,
        )


async def _ticket_for_user(
    db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID
) -> EventTicket | None:
    return await db.scalar(
        select(EventTicket).where(
            EventTicket.event_id == event_id,
            EventTicket.user_id == user_id,
        )
    )


async def _waitlist_for_user(
    db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID
) -> EventWaitlist | None:
    return await db.scalar(
        select(EventWaitlist).where(
            EventWaitlist.event_id == event_id,
            EventWaitlist.user_id == user_id,
        )
    )


async def _set_confirmed_ticket(
    db: AsyncSession,
    event: Event,
    user_id: uuid.UUID,
    qty: int,
) -> None:
    ticket = await _ticket_for_user(db, event.id, user_id)
    if ticket is not None:
        ticket.status = EventTicketStatus.confirmed
        ticket.qty = qty
        ticket.amount_paise = 0
    else:
        db.add(
            EventTicket(
                event_id=event.id,
                society_id=event.society_id,
                user_id=user_id,
                qty=qty,
                amount_paise=0,
                status=EventTicketStatus.confirmed,
            )
        )
    waiting = await _waitlist_for_user(db, event.id, user_id)
    if waiting is not None:
        await db.delete(waiting)


async def _promote_waitlist(db: AsyncSession, event: Event) -> None:
    if event.event_type != EventType.free or event.status != EventStatus.published:
        return
    remaining = event.capacity - await mappers.going_count_for(db, event.id)
    entries = (
        await db.scalars(
            select(EventWaitlist)
            .where(EventWaitlist.event_id == event.id)
            .order_by(EventWaitlist.created_at.asc(), EventWaitlist.id.asc())
        )
    ).all()
    for entry in entries:
        if entry.qty > remaining:
            break
        await _set_confirmed_ticket(db, event, entry.user_id, entry.qty)
        remaining -= entry.qty


async def rsvp_event(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventRsvpIn,
) -> HomeEventOut:
    event = await _published_event(db, member, slug)
    if event.event_type == EventType.paid and event.price_paise > 0:
        raise AppError("payment_required", "Paid events are not bookable yet.", 400)

    _assert_guest_qty(event, body.qty)
    going = await mappers.going_count_for(db, event.id)
    existing = await _ticket_for_user(db, event.id, member.user.id)
    confirmed = existing is not None and existing.status == EventTicketStatus.confirmed
    taken_by_self = existing.qty if confirmed else 0
    if going - taken_by_self + body.qty > event.capacity:
        raise AppError("capacity_full", "This event is full.", 409)

    await _set_confirmed_ticket(db, event, member.user.id, body.qty)
    await db.commit()
    return await _event_out(db, event)


async def leave_event(db: AsyncSession, member: CurrentMember, slug: str) -> HomeEventOut:
    event = await _event_for_society(db, member, slug)
    ticket = await db.scalar(
        select(EventTicket).where(
            EventTicket.event_id == event.id,
            EventTicket.user_id == member.user.id,
            EventTicket.status == EventTicketStatus.confirmed,
        )
    )
    if ticket is not None:
        ticket.status = EventTicketStatus.cancelled
        await _promote_waitlist(db, event)
        await db.commit()
    return await _event_out(db, event)


async def join_waitlist(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
    body: EventRsvpIn,
) -> EventDetailOut:
    event = await _published_event(db, member, slug)
    _assert_guest_qty(event, body.qty)
    existing = await _ticket_for_user(db, event.id, member.user.id)
    if existing is not None and existing.status == EventTicketStatus.confirmed:
        raise AppError("validation_error", "You are already going to this event.", 422)

    going = await mappers.going_count_for(db, event.id)
    if going + body.qty <= event.capacity:
        if event.event_type == EventType.paid and event.price_paise > 0:
            raise AppError("payment_required", "Paid events are not bookable yet.", 400)
        await _set_confirmed_ticket(db, event, member.user.id, body.qty)
        await db.commit()
        return await get_event_detail(db, member, slug)

    waiting = await _waitlist_for_user(db, event.id, member.user.id)
    if waiting is not None:
        waiting.qty = body.qty
    else:
        db.add(
            EventWaitlist(
                event_id=event.id,
                society_id=member.society_id,
                user_id=member.user.id,
                qty=body.qty,
                # SQLite's now() is whole seconds; FIFO needs finer ordering.
                created_at=datetime.now(UTC),
            )
        )
    await db.commit()
    return await get_event_detail(db, member, slug)


async def leave_waitlist(
    db: AsyncSession,
    member: CurrentMember,
    slug: str,
) -> EventDetailOut:
    event = await _event_for_society(db, member, slug)
    waiting = await _waitlist_for_user(db, event.id, member.user.id)
    if waiting is not None:
        await db.delete(waiting)
        await db.commit()
    return await get_event_detail(db, member, slug)


async def _event_out(db: AsyncSession, event: Event) -> HomeEventOut:
    host = await mappers.host_label_for(db, event.host_id)
    going = await mappers.going_count_for(db, event.id)
    people = await mappers.public_going_for(db, event.id)
    return mappers.event_to_home_event(event, host_label=host, going_count=going, going=people)
