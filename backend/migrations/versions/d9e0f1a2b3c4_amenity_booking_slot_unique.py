"""one confirmed booking per amenity slot

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-10-03 13:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The baseline create_all already adds this index on fresh databases.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_amenity_bookings_active_slot "
        "ON amenity_bookings (amenity_id, starts_at) WHERE status = 'confirmed'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_amenity_bookings_active_slot")
