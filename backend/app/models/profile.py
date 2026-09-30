import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.models.base import Base


class Profile(Base):
    """One row per user, scoped to the society they belong to (single-society product for now)."""

    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    interests: Mapped[list[str]] = mapped_column(
        ARRAY(String(100)), server_default=text("'{}'::varchar[]")
    )
    is_visible: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    show_flat: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="profile")
