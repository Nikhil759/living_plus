import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, TSTZRANGE
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text

from app.models.base import Base, IdTimestampMixin
from app.models.enums import AmenityBookingStatus, AmenityType, CrowdLevel


class Amenity(Base, IdTimestampMixin):
    __tablename__ = "amenities"

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    amenity_type: Mapped[AmenityType] = mapped_column(
        SAEnum(AmenityType, name="amenity_type"), default=AmenityType.other
    )
    capacity: Mapped[int] = mapped_column(default=1)
    open_hours: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb")
    )
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))

    status: Mapped["AmenityStatus | None"] = relationship(
        back_populates="amenity", uselist=False
    )
    bookings: Mapped[list["AmenityBooking"]] = relationship(back_populates="amenity")


class AmenityStatus(Base):
    __tablename__ = "amenity_status"

    amenity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    crowd_level: Mapped[CrowdLevel] = mapped_column(
        SAEnum(CrowdLevel, name="crowd_level"), default=CrowdLevel.quiet
    )
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    amenity: Mapped["Amenity"] = relationship(back_populates="status")


class AmenityBooking(Base, IdTimestampMixin):
    __tablename__ = "amenity_bookings"

    amenity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("amenities.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    time_range: Mapped[Any] = mapped_column(TSTZRANGE(), nullable=False)
    status: Mapped[AmenityBookingStatus] = mapped_column(
        SAEnum(AmenityBookingStatus, name="amenity_booking_status"),
        default=AmenityBookingStatus.confirmed,
    )

    amenity: Mapped["Amenity"] = relationship(back_populates="bookings")
