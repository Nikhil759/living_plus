from typing import Any

from sqlalchemy import Enum as SAEnum
from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.models.base import Base, IdTimestampMixin
from app.models.enums import SocietyPlan


class Society(Base, IdTimestampMixin):
    __tablename__ = "societies"

    name: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    invite_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    plan: Mapped[SocietyPlan] = mapped_column(
        SAEnum(SocietyPlan, name="society_plan"), default=SocietyPlan.free
    )
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))

    towers: Mapped[list["Tower"]] = relationship(back_populates="society")
    flats: Mapped[list["Flat"]] = relationship(back_populates="society")
    memberships: Mapped[list["Membership"]] = relationship(back_populates="society")
