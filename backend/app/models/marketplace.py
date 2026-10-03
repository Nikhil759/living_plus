import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    ListingCategory,
    ListingCondition,
    ListingContactMethod,
    ListingStatus,
)
from app.models.types import JsonList, UTCDateTime, enum_column


class MarketplaceListing(Base, IdTimestampMixin):
    __tablename__ = "marketplace_listings"
    __table_args__ = (Index("ix_marketplace_listings_feed", "society_id", "status", "listed_at"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    seller_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[ListingCategory] = mapped_column(enum_column(ListingCategory, "listing_cat"))
    condition: Mapped[ListingCondition] = mapped_column(
        enum_column(ListingCondition, "listing_condition")
    )
    # Whole rupees; 0 means the item is free.
    price_inr: Mapped[int] = mapped_column(Integer, default=0)
    negotiable: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    # Ordered photo URLs; the first one is the cover.
    photos: Mapped[list[str]] = mapped_column(JsonList(), default=list)
    contact_method: Mapped[ListingContactMethod] = mapped_column(
        enum_column(ListingContactMethod, "listing_contact_method")
    )
    pickup_note: Mapped[str] = mapped_column(String(120), default="Pickup in society")
    status: Mapped[ListingStatus] = mapped_column(
        enum_column(ListingStatus, "listing_status"), default=ListingStatus.available
    )
    # Resets on relist so a relisted item returns to the top of Browse.
    listed_at: Mapped[datetime] = mapped_column(UTCDateTime)
    removed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    removed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ListingReport(Base, IdTimestampMixin):
    __tablename__ = "marketplace_listing_reports"
    __table_args__ = (
        UniqueConstraint("listing_id", "reporter_id", name="uq_listing_reports_listing_reporter"),
    )

    listing_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("marketplace_listings.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    reason: Mapped[str] = mapped_column(String(200))
