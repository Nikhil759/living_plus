import re
import uuid
from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import Field, StringConstraints, field_validator, model_validator

from app.models.enums import (
    BusinessAvailability,
    BusinessCategory,
    BusinessReviewStatus,
    BusinessServes,
    ListingContactMethod,
    OfferingUnit,
    Weekday,
)
from app.schemas.base import CamelModel
from app.schemas.marketplace import clean_phone

MAX_GALLERY = 6
MAX_OFFERINGS = 10
MAX_PRICE_INR = 10_000_000

# Only our own storage or the bundled demo images, so listings cannot hotlink.
_PHOTO_RE = re.compile(
    r"^(/v1/uploads/business-photos/[0-9a-f-]{36}\.(jpg|png|webp)"
    r"|/images/local-businesses/[a-z0-9-]+\.(jpg|jpeg|png|webp))$"
)

Text = Annotated[str, StringConstraints(strip_whitespace=True)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]


def _check_photo(url: str) -> str:
    if not _PHOTO_RE.match(url):
        raise ValueError("Photos must be uploaded through Living+.")
    return url


class OfferingIn(CamelModel):
    name: Annotated[Text, StringConstraints(min_length=1, max_length=60)]
    price_inr: int = Field(ge=1, le=MAX_PRICE_INR)
    unit: OfferingUnit
    note: Annotated[Text, StringConstraints(max_length=60)] | None = None


class OfferingOut(OfferingIn):
    pass


class BusinessIn(CamelModel):
    """Create and edit share one body, matching the single form."""

    name: Annotated[Text, StringConstraints(min_length=1, max_length=50)]
    category: BusinessCategory
    tagline: Annotated[Text, StringConstraints(min_length=1, max_length=80)]
    about: Annotated[Text, StringConstraints(max_length=600)] | None = None
    cover_url: str
    photos: list[str] = Field(default_factory=list, max_length=MAX_GALLERY)
    offerings: list[OfferingIn] = Field(min_length=1, max_length=MAX_OFFERINGS)
    timings: Annotated[Text, StringConstraints(min_length=1, max_length=80)]
    days: list[Weekday] = Field(min_length=1, max_length=7)
    serves: BusinessServes
    contact_method: ListingContactMethod
    # Only used to fill in a missing profile phone. Never returned by any endpoint.
    phone: str | None = None

    @field_validator("cover_url")
    @classmethod
    def _cover_valid(cls, url: str) -> str:
        return _check_photo(url)

    @field_validator("photos")
    @classmethod
    def _photos_valid(cls, photos: list[str]) -> list[str]:
        if len(set(photos)) != len(photos):
            raise ValueError("Each photo can be added once.")
        return [_check_photo(url) for url in photos]

    @field_validator("days")
    @classmethod
    def _days_unique(cls, days: list[Weekday]) -> list[Weekday]:
        if len(set(days)) != len(days):
            raise ValueError("Each day can be picked once.")
        return days

    @field_validator("phone")
    @classmethod
    def _phone_valid(cls, phone: str | None) -> str | None:
        return clean_phone(phone)

    @model_validator(mode="after")
    def _cover_not_repeated(self) -> Self:
        if self.cover_url in self.photos:
            raise ValueError("The cover photo is already shown first.")
        return self


class BusinessAvailabilityIn(CamelModel):
    availability: BusinessAvailability


class StartingPrice(CamelModel):
    price_inr: int
    unit: OfferingUnit


class BusinessCardOut(CamelModel):
    id: uuid.UUID
    name: str
    category: BusinessCategory
    tagline: str
    cover_url: str
    owner_first_name: str
    tower: str | None
    starting_price: StartingPrice | None
    recommendation_count: int
    availability: BusinessAvailability
    review_status: BusinessReviewStatus
    is_featured: bool
    is_mine: bool
    created_at: datetime


class BusinessOwnerOut(CamelModel):
    first_name: str
    avatar_url: str | None
    tower: str | None
    member_since: int


class LatestUpdateOut(CamelModel):
    text: str
    created_at: datetime


class RecommendationOut(CamelModel):
    id: uuid.UUID
    first_name: str
    tower: str | None
    note: str
    created_at: datetime


class BusinessViewerOut(CamelModel):
    following: bool
    recommended: bool
    my_note: str | None


class BusinessDetailOut(BusinessCardOut):
    about: str | None
    photos: list[str]
    offerings: list[OfferingOut]
    timings: str
    days: list[Weekday]
    serves: BusinessServes
    contact_method: ListingContactMethod
    owner: BusinessOwnerOut
    latest_update: LatestUpdateOut | None
    # Two or three newest notes, only from residents whose profile is visible.
    recommendations: list[RecommendationOut]
    viewer: BusinessViewerOut
    # Owner and committee only.
    follower_count: int | None
    can_manage: bool
    # Only shown to the owner and the committee.
    rejection_reason: str | None
    can_review: bool


class UpdateIn(CamelModel):
    text: Annotated[Text, StringConstraints(min_length=1, max_length=280)]


class RecommendIn(CamelModel):
    note: Annotated[Text, StringConstraints(max_length=140)] | None = None


class FeaturedIn(CamelModel):
    featured: bool


class ReasonIn(CamelModel):
    reason: Reason


class ReviewIn(CamelModel):
    decision: Literal["approve", "reject"]
    reason: Reason | None = None

    @model_validator(mode="after")
    def _reject_needs_reason(self) -> Self:
        if self.decision == "reject" and not self.reason:
            raise ValueError("Give a reason for rejecting this business.")
        return self
