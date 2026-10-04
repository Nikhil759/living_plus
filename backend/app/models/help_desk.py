import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    ActorRole,
    FeedbackTopic,
    TicketCategory,
    TicketScope,
    TicketStatus,
    TicketUpdateKind,
    TicketUrgency,
    VendorCategory,
)
from app.models.types import JsonList, UTCDateTime, enum_column


def _society_fk() -> Mapped[uuid.UUID]:
    return mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )


class Vendor(Base, IdTimestampMixin):
    __tablename__ = "vendors"

    society_id: Mapped[uuid.UUID] = _society_fk()
    name: Mapped[str] = mapped_column(String(80))
    category: Mapped[VendorCategory] = mapped_column(enum_column(VendorCategory, "vendor_category"))
    emoji: Mapped[str] = mapped_column(String(8), default="🛠️")
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    note: Mapped[str | None] = mapped_column(String(160), nullable=True)
    hours_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    society_approved: Mapped[bool] = mapped_column(Boolean, default=True)


class Ticket(Base, IdTimestampMixin):
    """A help desk issue. Common-area issues are shared through followers ("Me too")."""

    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("society_id", "number", name="uq_tickets_society_number"),
        Index("ix_tickets_queue", "society_id", "status", "created_at"),
    )

    society_id: Mapped[uuid.UUID] = _society_fk()
    # Per-society sequence, shown as "HD-1042".
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(500))
    category: Mapped[TicketCategory] = mapped_column(enum_column(TicketCategory, "ticket_category"))
    scope: Mapped[TicketScope] = mapped_column(enum_column(TicketScope, "ticket_scope"))
    tower_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("towers.id", ondelete="CASCADE")
    )
    area_label: Mapped[str | None] = mapped_column(String(60), nullable=True)
    urgency: Mapped[TicketUrgency] = mapped_column(enum_column(TicketUrgency, "ticket_urgency"))
    status: Mapped[TicketStatus] = mapped_column(
        enum_column(TicketStatus, "ticket_status"), default=TicketStatus.open
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    assigned_vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True
    )
    # Resolved by the committee but not yet confirmed fixed by a resident.
    awaiting_confirmation: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    photo_urls: Mapped[list[str]] = mapped_column(JsonList(), default=list)


class TicketFollower(Base, IdTimestampMixin):
    __tablename__ = "ticket_followers"
    __table_args__ = (UniqueConstraint("ticket_id", "user_id", name="uq_ticket_followers_pair"),)

    society_id: Mapped[uuid.UUID] = _society_fk()
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )


class TicketUpdate(Base, IdTimestampMixin):
    __tablename__ = "ticket_updates"

    society_id: Mapped[uuid.UUID] = _society_fk()
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[TicketUpdateKind] = mapped_column(
        enum_column(TicketUpdateKind, "ticket_update_kind")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_role: Mapped[ActorRole] = mapped_column(enum_column(ActorRole, "actor_role"))
    message: Mapped[str] = mapped_column(String(500))


class Feedback(Base, IdTimestampMixin):
    """Feedback to the committee. Anonymous feedback never stores who sent it."""

    __tablename__ = "feedback"

    society_id: Mapped[uuid.UUID] = _society_fk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    topic: Mapped[FeedbackTopic] = mapped_column(enum_column(FeedbackTopic, "feedback_topic"))
    message: Mapped[str] = mapped_column(String(1000))
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
