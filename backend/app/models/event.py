import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    EventAudience,
    EventCategory,
    EventRecurrence,
    EventStatus,
    EventTicketStatus,
    EventType,
    StallApplicationStatus,
)
from app.models.types import JsonList, UTCDateTime, UuidList, enum_column


class Event(Base, IdTimestampMixin):
    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("society_id", "public_slug", name="uq_events_society_id_public_slug"),
    )

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    public_slug: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_type: Mapped[EventType] = mapped_column(enum_column(EventType, "event_type"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    host_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    amenity_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("amenities.id", ondelete="SET NULL"), nullable=True
    )
    location_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime)
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime)
    capacity: Mapped[int] = mapped_column(default=50)
    price_paise: Mapped[int] = mapped_column(default=0)
    status: Mapped[EventStatus] = mapped_column(
        enum_column(EventStatus, "event_status"), default=EventStatus.published
    )
    tags: Mapped[list[str]] = mapped_column(JsonList(), default=list)
    category: Mapped[EventCategory] = mapped_column(
        enum_column(EventCategory, "event_category"),
        default=EventCategory.other,
    )
    what_to_bring: Mapped[str | None] = mapped_column(Text, nullable=True)
    guest_limit: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    audience_type: Mapped[EventAudience] = mapped_column(
        enum_column(EventAudience, "event_audience"),
        default=EventAudience.society,
    )
    audience_group_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    audience_tower_ids: Mapped[list[uuid.UUID]] = mapped_column(UuidList(), default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_summary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    changed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    series_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), index=True, nullable=True
    )
    occurrence_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recurrence: Mapped[EventRecurrence] = mapped_column(
        enum_column(EventRecurrence, "event_recurrence"),
        default=EventRecurrence.none,
    )
    recurrence_ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    recurrence_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stalls_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    stall_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stall_fee_paise: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    stall_categories: Mapped[list[Any]] = mapped_column(JsonList(), default=list)
    stall_application_deadline: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)

    tickets: Mapped[list["EventTicket"]] = relationship(back_populates="event")
    waitlist: Mapped[list["EventWaitlist"]] = relationship(back_populates="event")
    stall_applications: Mapped[list["StallApplication"]] = relationship(back_populates="event")


class EventTicket(Base, IdTimestampMixin):
    __tablename__ = "event_tickets"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_tickets_event_user"),)

    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    qty: Mapped[int] = mapped_column(default=1)
    amount_paise: Mapped[int] = mapped_column(default=0)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    status: Mapped[EventTicketStatus] = mapped_column(
        enum_column(EventTicketStatus, "event_ticket_status"), default=EventTicketStatus.confirmed
    )
    checked_in_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)

    event: Mapped["Event"] = relationship(back_populates="tickets")


class EventWaitlist(Base, IdTimestampMixin):
    __tablename__ = "event_waitlist"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_waitlist_event_user"),
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    qty: Mapped[int] = mapped_column(Integer, default=1)

    event: Mapped["Event"] = relationship(back_populates="waitlist")


class StallApplication(Base, IdTimestampMixin):
    __tablename__ = "stall_applications"

    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    stall_type: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee_paise: Mapped[int] = mapped_column(default=0)
    spot_no: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[StallApplicationStatus] = mapped_column(
        enum_column(StallApplicationStatus, "stall_application_status"),
        default=StallApplicationStatus.pending,
    )

    event: Mapped["Event"] = relationship(back_populates="stall_applications")
