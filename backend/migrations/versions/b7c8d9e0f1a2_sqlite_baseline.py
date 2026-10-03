"""SQLite baseline schema.

Revision ID: b7c8d9e0f1a2
Revises:
Create Date: 2026-10-03 11:30:00.000000

"""

from typing import Sequence, Union

from alembic import op

from app.models import Base

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
