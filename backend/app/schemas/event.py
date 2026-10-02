from datetime import datetime

from pydantic import Field, field_validator

from app.models.enums import EventType
from app.schemas.base import CamelModel


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
