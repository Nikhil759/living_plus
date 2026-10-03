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


def _normalize_tags(value: list[str]) -> list[str]:
    cleaned = [t.strip() for t in value if t.strip()]
    if len(cleaned) > 20:
        raise ValueError("At most 20 tags.")
    for tag in cleaned:
        if len(tag) > 50:
            raise ValueError("Each tag must be at most 50 characters.")
    return cleaned


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


_LOCAL_COVER_PREFIX = "/v1/uploads/event-covers/"


def _normalize_cover_url(value: str | None) -> str | None:
    cleaned = _normalize_optional_text(value)
    if cleaned is None:
        return None
    if cleaned.startswith(_LOCAL_COVER_PREFIX):
        name = cleaned.removeprefix(_LOCAL_COVER_PREFIX)
        if "/" in name or ".." in name:
            raise ValueError("Cover URL is not valid.")
        return cleaned
    if cleaned.startswith("https://") or cleaned.startswith("http://"):
        return cleaned
    raise ValueError("Cover must be an uploaded file or an http(s) URL.")


class EventCreate(CamelModel):
    title: str = Field(min_length=3, max_length=200)
    location_label: str = Field(min_length=1, max_length=200)
    starts_at: datetime
    ends_at: datetime | None = None
    description: str | None = Field(default=None, max_length=5000)
    event_type: EventType = EventType.free
    tags: list[str] = Field(default_factory=list, max_length=20)
    cover_url: str | None = Field(default=None, max_length=2048)
    category: EventCategory = EventCategory.other
    capacity: int = Field(default=50, ge=1, le=2000)
    guest_limit: int = Field(default=0, ge=0, le=10)
    what_to_bring: str | None = Field(default=None, max_length=500)
    save_as_draft: bool = False

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        return _normalize_tags(value)

    @field_validator("description", "what_to_bring")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @field_validator("cover_url")
    @classmethod
    def normalize_cover(cls, value: str | None) -> str | None:
        return _normalize_cover_url(value)


class EventUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    location_label: str | None = Field(default=None, min_length=1, max_length=200)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    description: str | None = Field(default=None, max_length=5000)
    tags: list[str] | None = Field(default=None, max_length=20)
    cover_url: str | None = Field(default=None, max_length=2048)
    category: EventCategory | None = None
    capacity: int | None = Field(default=None, ge=1, le=2000)
    guest_limit: int | None = Field(default=None, ge=0, le=10)
    what_to_bring: str | None = Field(default=None, max_length=500)
    publish: bool = False

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return _normalize_tags(value)

    @field_validator("description", "what_to_bring")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @field_validator("cover_url")
    @classmethod
    def normalize_cover(cls, value: str | None) -> str | None:
        return _normalize_cover_url(value)


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
