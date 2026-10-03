import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal, Self
from zoneinfo import ZoneInfo

from pydantic import Field, StringConstraints, field_validator, model_validator

from app.models.enums import (
    ListingContactMethod,
    OpeningFurnishing,
    OpeningIncluded,
    OpeningKind,
    OpeningPreference,
)
from app.schemas.base import CamelModel
from app.schemas.marketplace import Reason, clean_phone

MAX_DESCRIPTION = 400
MIN_RENT, MAX_RENT = 1_000, 500_000
MAX_ADVANCE_DAYS = 365
IST = ZoneInfo("Asia/Kolkata")

# Rooms and flatmates are about who shares the home; a whole flat is about who rents it.
SHARED_PREFERENCES = {
    OpeningPreference.anyone,
    OpeningPreference.women_only,
    OpeningPreference.men_only,
}
FULL_FLAT_PREFERENCES = {
    OpeningPreference.anyone,
    OpeningPreference.family,
    OpeningPreference.working_professionals,
}

OpeningState = Literal["active", "filled", "expired"]


def today_ist() -> date:
    return datetime.now(UTC).astimezone(IST).date()


class OpeningIn(CamelModel):
    """Create and edit share one body, matching the single Post an opening form."""

    kind: OpeningKind
    tower_id: uuid.UUID
    floor: int | None = Field(default=None, ge=0, le=60)
    bhk: int = Field(ge=1, le=4)
    furnishing: OpeningFurnishing
    rent_inr: int = Field(ge=MIN_RENT, le=MAX_RENT)
    deposit_inr: int | None = Field(default=None, ge=1, le=5_000_000)
    maintenance_included: bool = True
    maintenance_inr: int | None = Field(default=None, ge=1, le=100_000)
    # Empty means "Available now".
    available_from: date | None = None
    preference: OpeningPreference
    included: list[OpeningIncluded] = Field(default_factory=list, max_length=len(OpeningIncluded))
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_DESCRIPTION)
    ]
    contact_method: ListingContactMethod
    # Only used to fill in a missing profile phone. Never returned by any endpoint.
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def _phone_valid(cls, phone: str | None) -> str | None:
        return clean_phone(phone)

    @field_validator("included")
    @classmethod
    def _included_unique(cls, items: list[OpeningIncluded]) -> list[OpeningIncluded]:
        if len(set(items)) != len(items):
            raise ValueError("Each item can be ticked once.")
        return items

    @field_validator("available_from")
    @classmethod
    def _date_in_range(cls, value: date | None) -> date | None:
        today = today_ist()
        if value is not None and not today <= value <= today + timedelta(days=MAX_ADVANCE_DAYS):
            raise ValueError("Pick today or a date within the next year.")
        return value

    @model_validator(mode="after")
    def _cross_field_rules(self) -> Self:
        allowed = (
            FULL_FLAT_PREFERENCES if self.kind == OpeningKind.full_flat else SHARED_PREFERENCES
        )
        if self.preference not in allowed:
            raise ValueError("That preference doesn't fit this kind of opening.")
        if self.maintenance_included:
            self.maintenance_inr = None
        elif self.maintenance_inr is None:
            raise ValueError("Enter the monthly maintenance amount.")
        return self


class OpeningRemoveIn(CamelModel):
    reason: Reason | None = None


class OpeningCardOut(CamelModel):
    id: uuid.UUID
    kind: OpeningKind
    # Generated from kind, BHK and tower, e.g. "Room in 1 BHK · Tower C".
    title: str
    rent_inr: int
    bhk: int
    tower: str
    floor: int | None
    furnishing: OpeningFurnishing
    # Empty means "Available now" (including dates already past).
    available_from: date | None
    preference: OpeningPreference
    description: str
    posted_by: str
    posted_at: datetime
    is_mine: bool
    state: OpeningState


class OpeningPosterOut(CamelModel):
    first_name: str
    tower: str


class OpeningDetailOut(OpeningCardOut):
    tower_id: uuid.UUID
    deposit_inr: int | None
    maintenance_included: bool
    maintenance_inr: int | None
    included: list[OpeningIncluded]
    contact_method: ListingContactMethod
    poster: OpeningPosterOut
    # Committee members can remove any listing; only the poster edits it.
    can_remove: bool
    # Poster only: when the listing lapses, and whether to offer "Still available".
    expires_at: datetime | None
    can_renew: bool


class TowerOut(CamelModel):
    id: uuid.UUID
    name: str


class OpeningOptionsOut(CamelModel):
    first_name: str
    tower_id: uuid.UUID | None
    towers: list[TowerOut]
    has_phone: bool
