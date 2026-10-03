import uuid

from sqlalchemy import ForeignKey, Index, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin
from app.models.enums import MembershipRole, MembershipStatus
from app.models.types import enum_column


class Membership(Base, IdTimestampMixin):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "society_id", name="uq_memberships_user_id_society_id"),
        Index("ix_memberships_society_id_status", "society_id", "status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    flat_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("flats.id", ondelete="SET NULL"), nullable=True
    )
    role: Mapped[MembershipRole] = mapped_column(
        enum_column(MembershipRole, "membership_role"), default=MembershipRole.tenant
    )
    status: Mapped[MembershipStatus] = mapped_column(
        enum_column(MembershipStatus, "membership_status"), default=MembershipStatus.pending
    )

    user: Mapped["User"] = relationship(back_populates="memberships")
    society: Mapped["Society"] = relationship(back_populates="memberships")
    flat: Mapped["Flat | None"] = relationship(back_populates="memberships")
