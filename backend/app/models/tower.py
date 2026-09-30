import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin


class Tower(Base, IdTimestampMixin):
    __tablename__ = "towers"
    __table_args__ = (UniqueConstraint("society_id", "name", name="uq_towers_society_id_name"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))

    society: Mapped["Society"] = relationship(back_populates="towers")
    flats: Mapped[list["Flat"]] = relationship(back_populates="tower")
