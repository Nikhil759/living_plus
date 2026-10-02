from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.core.errors import AppError
from app.models import Event
from app.schemas.event import EventCreate, EventRsvpIn
from app.schemas.home import HomeEventOut
from app.services import events as event_service
from app.services import mappers

router = APIRouter(prefix="/events", tags=["events"])


async def _event_for_slug(db: DbSession, society_id, slug: str) -> Event:
    from sqlalchemy import select

    from app.models.enums import EventStatus

    event = await db.scalar(
        select(Event).where(
            Event.society_id == society_id,
            Event.public_slug == slug,
            Event.status == EventStatus.published,
        )
    )
    if event is None:
        raise AppError("not_found", "Event not found.", 404)
    return event


@router.get("", response_model=list[HomeEventOut])
async def list_events(db: DbSession, member: CurrentMemberDep) -> list[HomeEventOut]:
    return await mappers.map_events(db, member.society_id)


@router.get("/{slug}", response_model=HomeEventOut)
async def get_event(slug: str, db: DbSession, member: CurrentMemberDep) -> HomeEventOut:
    event = await _event_for_slug(db, member.society_id, slug)
    host = await mappers.host_label_for(db, event.host_id)
    going = await mappers.going_count_for(db, event.id)
    return mappers.event_to_home_event(event, host_label=host, going_count=going)


@router.post("", response_model=HomeEventOut, status_code=201)
async def create_event(
    body: EventCreate,
    db: DbSession,
    member: CurrentMemberDep,
) -> HomeEventOut:
    return await event_service.create_event(db, member, body)


@router.post("/{slug}/rsvp", response_model=HomeEventOut)
async def rsvp_event(
    slug: str,
    body: EventRsvpIn,
    db: DbSession,
    member: CurrentMemberDep,
) -> HomeEventOut:
    return await event_service.rsvp_event(db, member, slug, body)
