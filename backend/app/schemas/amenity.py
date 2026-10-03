from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.home import AmenityOut

SlotState = Literal["free", "booked", "yours", "blocked", "past"]
CrowdName = Literal["quiet", "moderate", "busy"]


class AmenityDetailOut(AmenityOut):
    capacity: int
    hours_label: str
    rules: list[str]
    closure_note: str | None = None
    advance_days: int = 0
    max_hours_per_day: int = 0


class SlotOut(CamelModel):
    starts_at: datetime
    ends_at: datetime
    state: SlotState
    label: str | None = None
    booking_id: str | None = None


class SlotsOut(CamelModel):
    date: date
    slots: list[SlotOut]


class CrowdHourOut(CamelModel):
    hour: int
    level: CrowdName


class CrowdOut(CamelModel):
    date: date
    hours: list[CrowdHourOut]
    current_hour: int | None = None
    summary: str


class BookingIn(CamelModel):
    starts_at: datetime


class BookingOut(CamelModel):
    id: str
    amenity_id: str
    amenity_name: str
    starts_at: datetime
    ends_at: datetime


class AmenityClosureIn(CamelModel):
    closed: bool
    note: str | None = Field(default=None, max_length=200)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        return (value or "").strip() or None
