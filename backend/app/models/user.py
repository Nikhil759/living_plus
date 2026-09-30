from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin


class User(Base, IdTimestampMixin):
    __tablename__ = "users"

    supabase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="user")
    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False)
