"""event waitlist

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-10-03 12:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if sa.inspect(bind).has_table("event_waitlist"):
        return
    op.create_table(
        "event_waitlist",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("society_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
            name="fk_event_waitlist_event_id_events",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["society_id"],
            ["societies.id"],
            name="fk_event_waitlist_society_id_societies",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_event_waitlist_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_event_waitlist"),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_waitlist_event_user"),
    )
    op.create_index("ix_event_waitlist_event_id", "event_waitlist", ["event_id"])
    op.create_index("ix_event_waitlist_society_id", "event_waitlist", ["society_id"])
    op.create_index("ix_event_waitlist_user_id", "event_waitlist", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if not sa.inspect(bind).has_table("event_waitlist"):
        return
    op.drop_index("ix_event_waitlist_user_id", table_name="event_waitlist")
    op.drop_index("ix_event_waitlist_society_id", table_name="event_waitlist")
    op.drop_index("ix_event_waitlist_event_id", table_name="event_waitlist")
    op.drop_table("event_waitlist")
