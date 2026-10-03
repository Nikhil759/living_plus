import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, SmallInteger, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    ListingContactMethod,
    OpeningFurnishing,
    OpeningKind,
    OpeningPreference,
    OpeningStatus,
)
from app.models.types import JsonList, UTCDateTime, enum_column


class FlatOpening(Base, IdTimestampMixin):
    """A room, flatmate or full-flat opening. Stores tower and floor, never the unit number."""

    __tablename__ = "flat_openings"
    __table_args__ = (Index("ix_flat_openings_feed", "society_id", "status", "listed_at"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    poster_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    tower_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("towers.id", ondelete="CASCADE")
    )
    kind: Mapped[OpeningKind] = mapped_column(enum_column(OpeningKind, "opening_kind"))
    # 1 to 4, where 4 means "4+".
    bhk: Mapped[int] = mapped_column(SmallInteger)
    # 0 is the ground floor.
    floor: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    furnishing: Mapped[OpeningFurnishing] = mapped_column(
        enum_column(OpeningFurnishing, "opening_furnishing")
    )
    rent_inr: Mapped[int] = mapped_column(Integer)
    deposit_inr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    maintenance_included: Mapped[bool] = mapped_column(Boolean, default=True)
    maintenance_inr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Empty means "Available now".
    available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    preference: Mapped[OpeningPreference] = mapped_column(
        enum_column(OpeningPreference, "opening_preference")
    )
    included: Mapped[list[str]] = mapped_column(JsonList(), default=list)
    description: Mapped[str] = mapped_column(String(400))
    contact_method: Mapped[ListingContactMethod] = mapped_column(
        enum_column(ListingContactMethod, "listing_contact_method")
    )
    status: Mapped[OpeningStatus] = mapped_column(
        enum_column(OpeningStatus, "opening_status"), default=OpeningStatus.active
    )
    listed_at: Mapped[datetime] = mapped_column(UTCDateTime)
    # Listings lapse after 30 days unless the poster renews them.
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    removed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    removed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
