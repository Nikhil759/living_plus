"""events list foundation

Revision ID: d1e2f3a4b5c6
Revises: c8f1a2b3d4e5
Create Date: 2026-10-03 10:50:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c8f1a2b3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'rejected'")

    event_category = postgresql.ENUM(
        "sports",
        "fitness",
        "kids",
        "food",
        "music",
        "learning",
        "social",
        "other",
        name="event_category",
    )
    event_audience = postgresql.ENUM("society", "group", "towers", name="event_audience")
    event_recurrence = postgresql.ENUM(
        "none", "weekly", "biweekly", "monthly", name="event_recurrence"
    )
    event_category.create(op.get_bind(), checkfirst=True)
    event_audience.create(op.get_bind(), checkfirst=True)
    event_recurrence.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "events",
        sa.Column("category", event_category, server_default="other", nullable=False),
    )
    op.add_column("events", sa.Column("what_to_bring", sa.Text(), nullable=True))
    op.add_column(
        "events",
        sa.Column("guest_limit", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "events",
        sa.Column("audience_type", event_audience, server_default="society", nullable=False),
    )
    op.add_column("events", sa.Column("audience_group_id", sa.Uuid(), nullable=True))
    op.add_column(
        "events",
        sa.Column(
            "audience_tower_ids",
            postgresql.ARRAY(sa.Uuid()),
            server_default=sa.text("'{}'::uuid[]"),
            nullable=False,
        ),
    )
    op.add_column(
        "events",
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("events", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("cancel_reason", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("change_summary", sa.String(length=200), nullable=True))
    op.add_column("events", sa.Column("changed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("events", sa.Column("series_id", sa.Uuid(), nullable=True))
    op.add_column("events", sa.Column("occurrence_index", sa.Integer(), nullable=True))
    op.add_column(
        "events",
        sa.Column("recurrence", event_recurrence, server_default="none", nullable=False),
    )
    op.add_column("events", sa.Column("recurrence_ends_on", sa.Date(), nullable=True))
    op.add_column("events", sa.Column("recurrence_count", sa.Integer(), nullable=True))
    op.add_column(
        "events",
        sa.Column("stalls_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("events", sa.Column("stall_count", sa.Integer(), nullable=True))
    op.add_column(
        "events",
        sa.Column("stall_fee_paise", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "events",
        sa.Column(
            "stall_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "events",
        sa.Column("stall_application_deadline", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_events_series_id"), "events", ["series_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_events_audience_group_id_groups"),
        "events",
        "groups",
        ["audience_group_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "event_tickets",
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_event_tickets_event_user", "event_tickets", ["event_id", "user_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_event_tickets_event_user", "event_tickets", type_="unique")
    op.drop_column("event_tickets", "checked_in_at")

    op.drop_constraint(op.f("fk_events_audience_group_id_groups"), "events", type_="foreignkey")
    op.drop_index(op.f("ix_events_series_id"), table_name="events")
    op.drop_column("events", "stall_application_deadline")
    op.drop_column("events", "stall_categories")
    op.drop_column("events", "stall_fee_paise")
    op.drop_column("events", "stall_count")
    op.drop_column("events", "stalls_enabled")
    op.drop_column("events", "recurrence_count")
    op.drop_column("events", "recurrence_ends_on")
    op.drop_column("events", "recurrence")
    op.drop_column("events", "occurrence_index")
    op.drop_column("events", "series_id")
    op.drop_column("events", "changed_at")
    op.drop_column("events", "change_summary")
    op.drop_column("events", "cancel_reason")
    op.drop_column("events", "rejection_reason")
    op.drop_column("events", "is_featured")
    op.drop_column("events", "audience_tower_ids")
    op.drop_column("events", "audience_group_id")
    op.drop_column("events", "audience_type")
    op.drop_column("events", "guest_limit")
    op.drop_column("events", "what_to_bring")
    op.drop_column("events", "category")

    postgresql.ENUM(name="event_recurrence").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="event_audience").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="event_category").drop(op.get_bind(), checkfirst=True)
