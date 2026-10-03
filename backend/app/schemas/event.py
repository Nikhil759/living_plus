from datetime import datetime

from pydantic import Field, field_validator

from app.models.enums import (
    EventAudience,
    EventCategory,
    EventRecurrence,
    EventStatus,
    EventType,
)
from app.schemas.base import CamelModel
from app.schemas.home import HomeEventOut, PersonOut


class EventCreate(CamelModel):
    title: str = Field(min_length=3, max_length=200)
    location_label: str = Field(min_length=1, max_length=200)
    starts_at: datetime
    ends_at: datetime | None = None
    description: str | None = Field(default=None, max_length=5000)
    event_type: EventType = EventType.free
    tags: list[str] = Field(default_factory=list, max_length=20)
    cover_url: str | None = Field(default=None, max_length=2048)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        cleaned = [t.strip() for t in value if t.strip()]
        if len(cleaned) > 20:
            raise ValueError("At most 20 tags.")
        for tag in cleaned:
            if len(tag) > 50:
                raise ValueError("Each tag must be at most 50 characters.")
        return cleaned


class EventRsvpIn(CamelModel):
    qty: int = Field(default=1, ge=1, le=10)


class EventHostOut(CamelModel):
    id: str
    name: str
    avatar_url: str | None = None
    tower: str | None = None
    events_hosted: int = 0


class EventAttendeeFullOut(PersonOut):
    full_name: str
    tower: str | None = None
    guest_count: int = 0
    checked_in: bool = False


class EventListItemOut(HomeEventOut):
    event_type: EventType
    status: EventStatus
    category: EventCategory
    ends_at: str | None = None
    capacity: int
    spots_taken: int
    viewer_going: bool = False
    is_host: bool = False
    tags: list[str] = Field(default_factory=list)
    amenity_id: str | None = None
    change_summary: str | None = None
    cancel_reason: str | None = None


class EventDetailOut(EventListItemOut):
    description: str | None = None
    what_to_bring: str | None = None
    guest_limit: int = 0
    audience: EventAudience = EventAudience.society
    recurrence: EventRecurrence = EventRecurrence.none
    recurrence_label: str | None = None
    host_profile: EventHostOut
    attendees: list[EventAttendeeFullOut] | None = None
    rejection_reason: str | None = None
    stalls_enabled: bool = False
    is_committee: bool = False
