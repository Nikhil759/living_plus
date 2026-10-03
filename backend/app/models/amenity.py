import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Index, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin
from app.models.enums import AmenityBookingStatus, AmenityType, CrowdLevel
from app.models.types import JsonDict, UTCDateTime, enum_column


class Amenity(Base, IdTimestampMixin):
    __tablename__ = "amenities"

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    amenity_type: Mapped[AmenityType] = mapped_column(
        enum_column(AmenityType, "amenity_type"), default=AmenityType.other
    )
    capacity: Mapped[int] = mapped_column(default=1)
    open_hours: Mapped[dict[str, Any]] = mapped_column(JsonDict(), default=dict)
    rules: Mapped[dict[str, Any]] = mapped_column(JsonDict(), default=dict)

    status: Mapped["AmenityStatus | None"] = relationship(back_populates="amenity", uselist=False)
    bookings: Mapped[list["AmenityBooking"]] = relationship(back_populates="amenity")


class AmenityStatus(Base):
    __tablename__ = "amenity_status"

    amenity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    crowd_level: Mapped[CrowdLevel] = mapped_column(
        enum_column(CrowdLevel, "crowd_level"), default=CrowdLevel.quiet
    )
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, server_default=func.now(), onupdate=func.now()
    )

    amenity: Mapped["Amenity"] = relationship(back_populates="status")


class AmenityBooking(Base, IdTimestampMixin):
    __tablename__ = "amenity_bookings"
    __table_args__ = (
        # Two residents can never hold the same slot; cancelled rows are ignored.
        Index(
            "uq_amenity_bookings_active_slot",
            "amenity_id",
            "starts_at",
            unique=True,
            sqlite_where=text("status = 'confirmed'"),
        ),
    )

    amenity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("amenities.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    status: Mapped[AmenityBookingStatus] = mapped_column(
        enum_column(AmenityBookingStatus, "amenity_booking_status"),
        default=AmenityBookingStatus.confirmed,
    )

    amenity: Mapped["Amenity"] = relationship(back_populates="bookings")
