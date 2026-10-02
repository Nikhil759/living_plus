import re
import uuid
from datetime import UTC, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import Event, EventTicket
from app.models.enums import EventStatus, EventTicketStatus, EventType
from app.schemas.event import EventCreate, EventRsvpIn
from app.schemas.home import HomeEventOut
from app.services import mappers


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


async def create_event(
    db: AsyncSession,
    member: CurrentMember,
    body: EventCreate,
) -> HomeEventOut:
    if body.event_type != EventType.free:
        raise AppError(
            "validation_error",
            "Only free events can be created right now.",
            422,
        )

    starts = body.starts_at
    if starts.tzinfo is None:
        starts = starts.replace(tzinfo=UTC)
    ends = body.ends_at
    if ends is None:
        ends = starts + timedelta(hours=2)
    elif ends.tzinfo is None:
        ends = ends.replace(tzinfo=UTC)
    if ends <= starts:
        raise AppError("validation_error", "End time must be after start time.", 422)

    status = EventStatus.published

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
        capacity=50,
        price_paise=0,
        status=status,
        tags=body.tags,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    host = await mappers.host_label_for(db, event.host_id)
    return mappers.event_to_home_event(event, host_label=host, going_count=0)


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
            EventTicket.status == EventTicketStatus.confirmed,
        )
    )
    if existing is not None:
        return await _event_out(db, event)

    if going + body.qty > event.capacity:
        raise AppError("capacity_full", "This event is full.", 409)

    ticket = EventTicket(
        event_id=event.id,
        society_id=member.society_id,
        user_id=member.user.id,
        qty=body.qty,
        amount_paise=0,
        status=EventTicketStatus.confirmed,
    )
    db.add(ticket)
    await db.commit()
    return await _event_out(db, event)


async def _event_out(db: AsyncSession, event: Event) -> HomeEventOut:
    host = await mappers.host_label_for(db, event.host_id)
    going = await mappers.going_count_for(db, event.id)
    return mappers.event_to_home_event(event, host_label=host, going_count=going)

