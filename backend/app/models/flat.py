import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin


class Flat(Base, IdTimestampMixin):
    __tablename__ = "flats"
    __table_args__ = (UniqueConstraint("tower_id", "flat_no", name="uq_flats_tower_id_flat_no"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    tower_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("towers.id", ondelete="CASCADE"), index=True
    )
    flat_no: Mapped[str] = mapped_column(String(20))

    society: Mapped["Society"] = relationship(back_populates="flats")
    tower: Mapped["Tower"] = relationship(back_populates="flats")
    memberships: Mapped[list["Membership"]] = relationship(back_populates="flat")
