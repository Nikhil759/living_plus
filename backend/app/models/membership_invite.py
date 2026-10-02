import uuid
from datetime import datetime

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin
from app.models.enums import MembershipInviteStatus, MembershipRole


class MembershipInvite(Base, IdTimestampMixin):
    __tablename__ = "membership_invites"
    __table_args__ = (
        UniqueConstraint("code", name="uq_membership_invites_code"),
        Index("ix_membership_invites_society_id_status", "society_id", "status"),
    )

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    flat_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flats.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320))
    role: Mapped[MembershipRole] = mapped_column(
        SAEnum(MembershipRole, name="membership_role", create_constraint=False)
    )
    code: Mapped[str] = mapped_column(String(32))
    status: Mapped[MembershipInviteStatus] = mapped_column(
        SAEnum(MembershipInviteStatus, name="membership_invite_status"),
        default=MembershipInviteStatus.pending,
    )
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    consumed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    consumed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    society: Mapped["Society"] = relationship()
    flat: Mapped["Flat"] = relationship()
    consumed_by: Mapped["User | None"] = relationship()
