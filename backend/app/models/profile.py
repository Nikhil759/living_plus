import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.types import JsonList, UTCDateTime


class Profile(Base):
    """One row per user, scoped to the society they belong to (single-society product for now)."""

    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    interests: Mapped[list[str]] = mapped_column(JsonList(), default=list)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    show_flat: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="profile")
