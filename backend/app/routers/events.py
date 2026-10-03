from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models.enums import EventCategory, EventListTab, EventType
from app.schemas.event import (
    EventCancelIn,
    EventCreate,
    EventDetailOut,
    EventListItemOut,
    EventRsvpIn,
    EventUpdate,
)
from app.schemas.home import HomeEventOut
from app.services import events as event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventListItemOut])
async def list_events(
    db: DbSession,
    member: CurrentMemberDep,
    tab: EventListTab = EventListTab.upcoming,
    event_type: EventType | None = None,
    category: EventCategory | None = None,
    q: str | None = None,
) -> list[EventListItemOut]:
    return await event_service.list_events(
        db, member, tab=tab, event_type=event_type, category=category, q=q
    )


@router.get("/{slug}", response_model=EventDetailOut)
async def get_event(slug: str, db: DbSession, member: CurrentMemberDep) -> EventDetailOut:
    return await event_service.get_event_detail(db, member, slug)


@router.post("", response_model=EventDetailOut, status_code=201)
async def create_event(
    body: EventCreate,
    db: DbSession,
    member: CurrentMemberDep,
) -> EventDetailOut:
    return await event_service.create_event(db, member, body)


@router.patch("/{slug}", response_model=EventDetailOut)
async def update_event(
    slug: str,
    body: EventUpdate,
    db: DbSession,
    member: CurrentMemberDep,
) -> EventDetailOut:
    return await event_service.update_event(db, member, slug, body)


@router.post("/{slug}/cancel", response_model=EventDetailOut)
async def cancel_event(
    slug: str,
    body: EventCancelIn,
    db: DbSession,
    member: CurrentMemberDep,
) -> EventDetailOut:
    return await event_service.cancel_event(db, member, slug, body)


@router.post("/{slug}/duplicate", response_model=EventDetailOut, status_code=201)
async def duplicate_event(
    slug: str,
    db: DbSession,
    member: CurrentMemberDep,
) -> EventDetailOut:
    return await event_service.duplicate_event(db, member, slug)


@router.post("/{slug}/rsvp", response_model=HomeEventOut)
async def rsvp_event(
    slug: str,
    body: EventRsvpIn,
    db: DbSession,
    member: CurrentMemberDep,
) -> HomeEventOut:
    return await event_service.rsvp_event(db, member, slug, body)


@router.delete("/{slug}/rsvp", response_model=HomeEventOut)
async def leave_event(slug: str, db: DbSession, member: CurrentMemberDep) -> HomeEventOut:
    return await event_service.leave_event(db, member, slug)
