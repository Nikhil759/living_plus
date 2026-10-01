import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    EventStatus,
    EventTicketStatus,
    EventType,
    StallApplicationStatus,
)


class Event(Base, IdTimestampMixin):
    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("society_id", "public_slug", name="uq_events_society_id_public_slug"),
    )

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    public_slug: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_type: Mapped[EventType] = mapped_column(SAEnum(EventType, name="event_type"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    host_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    amenity_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("amenities.id", ondelete="SET NULL"), nullable=True
    )
    location_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    starts_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(default=50)
    price_paise: Mapped[int] = mapped_column(default=0)
    status: Mapped[EventStatus] = mapped_column(
        SAEnum(EventStatus, name="event_status"), default=EventStatus.published
    )
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), server_default=text("'{}'::varchar[]")
    )

    tickets: Mapped[list["EventTicket"]] = relationship(back_populates="event")
    stall_applications: Mapped[list["StallApplication"]] = relationship(back_populates="event")


class EventTicket(Base, IdTimestampMixin):
    __tablename__ = "event_tickets"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    qty: Mapped[int] = mapped_column(default=1)
    amount_paise: Mapped[int] = mapped_column(default=0)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    status: Mapped[EventTicketStatus] = mapped_column(
        SAEnum(EventTicketStatus, name="event_ticket_status"), default=EventTicketStatus.confirmed
    )

    event: Mapped["Event"] = relationship(back_populates="tickets")


class StallApplication(Base, IdTimestampMixin):
    __tablename__ = "stall_applications"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    stall_type: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee_paise: Mapped[int] = mapped_column(default=0)
    spot_no: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[StallApplicationStatus] = mapped_column(
        SAEnum(StallApplicationStatus, name="stall_application_status"),
        default=StallApplicationStatus.pending,
    )

    event: Mapped["Event"] = relationship(back_populates="stall_applications")
