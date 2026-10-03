import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    BusinessAvailability,
    BusinessCategory,
    BusinessReviewStatus,
    BusinessServes,
    ListingContactMethod,
)
from app.models.types import JsonList, enum_column


class LocalBusiness(Base, IdTimestampMixin):
    """A small business run by a resident. Needs one-time committee approval."""

    __tablename__ = "local_businesses"
    __table_args__ = (Index("ix_local_businesses_feed", "society_id", "review_status"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))
    category: Mapped[BusinessCategory] = mapped_column(
        enum_column(BusinessCategory, "biz_category")
    )
    tagline: Mapped[str] = mapped_column(String(80))
    about: Mapped[str | None] = mapped_column(String(600), nullable=True)
    cover_url: Mapped[str] = mapped_column(String(2048))
    # Up to six extra photos after the cover.
    photos: Mapped[list[str]] = mapped_column(JsonList(), default=list)
    # [{"name", "price_inr", "unit", "note"}]
    offerings: Mapped[list[dict[str, Any]]] = mapped_column(JsonList(), default=list)
    timings: Mapped[str] = mapped_column(String(80))
    days: Mapped[list[str]] = mapped_column(JsonList(), default=list)
    serves: Mapped[BusinessServes] = mapped_column(enum_column(BusinessServes, "biz_serves"))
    contact_method: Mapped[ListingContactMethod] = mapped_column(
        enum_column(ListingContactMethod, "biz_contact_method")
    )
    availability: Mapped[BusinessAvailability] = mapped_column(
        enum_column(BusinessAvailability, "biz_availability"),
        default=BusinessAvailability.taking_orders,
    )
    review_status: Mapped[BusinessReviewStatus] = mapped_column(
        enum_column(BusinessReviewStatus, "biz_review_status"),
        default=BusinessReviewStatus.pending,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    removed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")


class BusinessUpdate(Base, IdTimestampMixin):
    """A short post from the owner; the newest one shows on the profile."""

    __tablename__ = "local_business_updates"

    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("local_businesses.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(String(280))


class BusinessFollow(Base, IdTimestampMixin):
    __tablename__ = "local_business_follows"
    __table_args__ = (
        UniqueConstraint("business_id", "user_id", name="uq_business_follows_business_user"),
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("local_businesses.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )


class BusinessRecommendation(Base, IdTimestampMixin):
    __tablename__ = "local_business_recommendations"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "user_id", name="uq_business_recommendations_business_user"
        ),
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("local_businesses.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    note: Mapped[str | None] = mapped_column(String(140), nullable=True)
    # Set when the committee takes a note down; the recommendation itself still counts.
    note_removed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
