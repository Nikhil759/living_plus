"""flat openings

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-10-03 17:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _fk(column: str, target: str, ondelete: str = "CASCADE") -> sa.ForeignKeyConstraint:
    ref_table = target.split(".")[0]
    return sa.ForeignKeyConstraint(
        [column], [target], name=f"fk_flat_openings_{column}_{ref_table}", ondelete=ondelete
    )


def upgrade() -> None:
    # The baseline create_all already builds this table on fresh databases.
    if sa.inspect(op.get_bind()).has_table("flat_openings"):
        return
    op.create_table(
        "flat_openings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("society_id", sa.Uuid(), nullable=False),
        sa.Column("poster_id", sa.Uuid(), nullable=False),
        sa.Column("tower_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(15), nullable=False),
        sa.Column("bhk", sa.SmallInteger(), nullable=False),
        sa.Column("floor", sa.SmallInteger(), nullable=True),
        sa.Column("furnishing", sa.String(14), nullable=False),
        sa.Column("rent_inr", sa.Integer(), nullable=False),
        sa.Column("deposit_inr", sa.Integer(), nullable=True),
        sa.Column("maintenance_included", sa.Boolean(), nullable=False),
        sa.Column("maintenance_inr", sa.Integer(), nullable=True),
        sa.Column("available_from", sa.Date(), nullable=True),
        sa.Column("preference", sa.String(21), nullable=False),
        sa.Column("included", sa.JSON(), nullable=False),
        sa.Column("description", sa.String(400), nullable=False),
        sa.Column("contact_method", sa.String(8), nullable=False),
        sa.Column("status", sa.String(7), nullable=False),
        sa.Column("listed_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("reminder_sent_at", sa.DateTime(), nullable=True),
        sa.Column("removed_reason", sa.Text(), nullable=True),
        sa.Column("removed_by_id", sa.Uuid(), nullable=True),
        _fk("society_id", "societies.id"),
        _fk("poster_id", "users.id"),
        _fk("tower_id", "towers.id"),
        _fk("removed_by_id", "users.id", "SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_flat_openings"),
    )
    op.create_index("ix_flat_openings_society_id", "flat_openings", ["society_id"])
    op.create_index("ix_flat_openings_poster_id", "flat_openings", ["poster_id"])
    op.create_index("ix_flat_openings_feed", "flat_openings", ["society_id", "status", "listed_at"])


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS flat_openings")
