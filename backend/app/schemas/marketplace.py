import re
import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import Field, StringConstraints, field_validator, model_validator

from app.models.enums import (
    ListingCategory,
    ListingCondition,
    ListingContactMethod,
    ListingStatus,
)
from app.schemas.base import CamelModel

MAX_PHOTOS = 5
DEFAULT_PICKUP_NOTE = "Pickup in society"

# Only our own storage is accepted, so listings can never hotlink third-party images.
_PHOTO_RE = re.compile(
    r"^(/v1/uploads/listing-photos/[0-9a-f-]{36}\.(jpg|png|webp)"
    r"|/images/marketplace/[a-z0-9-]+\.(jpg|jpeg|png|webp))$"
)
_PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]


class ListingIn(CamelModel):
    """Create and edit share one body, matching the single Sell form."""

    title: Title
    category: ListingCategory
    condition: ListingCondition
    price_inr: int | None = Field(default=None, ge=0, le=10_000_000)
    is_free: bool = False
    negotiable: bool = False
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = (
        None
    )
    photos: list[str] = Field(min_length=1, max_length=MAX_PHOTOS)
    contact_method: ListingContactMethod
    pickup_note: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ] = DEFAULT_PICKUP_NOTE
    # Only used to fill in a missing profile phone. Never returned by any endpoint.
    phone: str | None = None

    @field_validator("photos")
    @classmethod
    def _photos_valid(cls, photos: list[str]) -> list[str]:
        if any(not _PHOTO_RE.match(url) for url in photos):
            raise ValueError("Photos must be uploaded through Living+.")
        if len(set(photos)) != len(photos):
            raise ValueError("Each photo can be added once.")
        return photos

    @field_validator("phone")
    @classmethod
    def _phone_valid(cls, phone: str | None) -> str | None:
        if phone is None or not phone.strip():
            return None
        cleaned = re.sub(r"[\s-]", "", phone)
        if not _PHONE_RE.match(cleaned):
            raise ValueError("Enter a valid phone number.")
        return cleaned

    @model_validator(mode="after")
    def _price_rules(self) -> Self:
        if self.is_free:
            self.price_inr, self.negotiable = 0, False
        elif not self.price_inr:
            raise ValueError("Enter a price, or tick 'Giving it away for free'.")
        return self


class ListingStatusIn(CamelModel):
    status: ListingStatus

    @field_validator("status")
    @classmethod
    def _not_removed(cls, status: ListingStatus) -> ListingStatus:
        if status == ListingStatus.removed:
            raise ValueError("Use the delete action to remove a listing.")
        return status


class ListingReasonIn(CamelModel):
    reason: Reason


class ListingRemoveIn(CamelModel):
    reason: Reason | None = None


class ListingCardOut(CamelModel):
    id: uuid.UUID
    title: str
    price_inr: int
    is_free: bool
    negotiable: bool
    condition: ListingCondition
    category: ListingCategory
    cover_url: str | None
    status: ListingStatus
    tower: str | None
    listed_at: datetime
    is_mine: bool
    # Only ever true for committee members.
    reported: bool


class ListingSellerOut(CamelModel):
    first_name: str
    avatar_url: str | None
    tower: str | None


class ListingDetailOut(ListingCardOut):
    description: str | None
    photos: list[str]
    pickup_note: str
    contact_method: ListingContactMethod
    seller: ListingSellerOut
    can_manage: bool


class SellerProfileOut(CamelModel):
    first_name: str
    avatar_url: str | None
    tower: str | None
    has_phone: bool


class ContactOut(CamelModel):
    method: ListingContactMethod
    url: str


class ReportOut(CamelModel):
    message: str
