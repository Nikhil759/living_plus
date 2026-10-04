"""help desk tables, community post types, society_id on community child tables

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-10-04 15:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Child tables that gain society_id, and the parent column it is copied from.
_BACKFILL = {
    "group_members": ("group_id", "groups"),
    "comments": ("post_id", "posts"),
    "reactions": ("post_id", "posts"),
}


def _fk(table: str, column: str, target: str, ondelete: str = "CASCADE") -> sa.ForeignKeyConstraint:
    ref_table = target.split(".")[0]
    return sa.ForeignKeyConstraint(
        [column], [target], name=f"fk_{table}_{column}_{ref_table}", ondelete=ondelete
    )


def _base(table: str) -> list:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("society_id", sa.Uuid(), nullable=False),
        _fk(table, "society_id", "societies.id"),
        sa.PrimaryKeyConstraint("id", name=f"pk_{table}"),
    ]


def _create_help_desk(inspector: sa.Inspector) -> None:
    if not inspector.has_table("vendors"):
        op.create_table(
            "vendors",
            *_base("vendors"),
            sa.Column("name", sa.String(80), nullable=False),
            sa.Column("category", sa.String(12), nullable=False),
            sa.Column("emoji", sa.String(8), nullable=False),
            sa.Column("phone", sa.String(20), nullable=True),
            sa.Column("whatsapp", sa.String(20), nullable=True),
            sa.Column("note", sa.String(160), nullable=True),
            sa.Column("hours_label", sa.String(40), nullable=True),
            sa.Column("society_approved", sa.Boolean(), nullable=False),
        )
        op.create_index("ix_vendors_society_id", "vendors", ["society_id"])

    if not inspector.has_table("tickets"):
        op.create_table(
            "tickets",
            *_base("tickets"),
            sa.Column("number", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(80), nullable=False),
            sa.Column("description", sa.String(500), nullable=False),
            sa.Column("category", sa.String(11), nullable=False),
            sa.Column("scope", sa.String(11), nullable=False),
            sa.Column("tower_id", sa.Uuid(), nullable=False),
            sa.Column("area_label", sa.String(60), nullable=True),
            sa.Column("urgency", sa.String(6), nullable=False),
            sa.Column("status", sa.String(11), nullable=False),
            sa.Column("reporter_id", sa.Uuid(), nullable=False),
            sa.Column("assigned_vendor_id", sa.Uuid(), nullable=True),
            sa.Column("awaiting_confirmation", sa.Boolean(), nullable=False),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("photo_urls", sa.JSON(), nullable=False),
            _fk("tickets", "tower_id", "towers.id"),
            _fk("tickets", "reporter_id", "users.id"),
            _fk("tickets", "assigned_vendor_id", "vendors.id", "SET NULL"),
            sa.UniqueConstraint("society_id", "number", name="uq_tickets_society_number"),
        )
        op.create_index("ix_tickets_society_id", "tickets", ["society_id"])
        op.create_index("ix_tickets_reporter_id", "tickets", ["reporter_id"])
        op.create_index("ix_tickets_queue", "tickets", ["society_id", "status", "created_at"])

    if not inspector.has_table("ticket_followers"):
        op.create_table(
            "ticket_followers",
            *_base("ticket_followers"),
            sa.Column("ticket_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            _fk("ticket_followers", "ticket_id", "tickets.id"),
            _fk("ticket_followers", "user_id", "users.id"),
            sa.UniqueConstraint("ticket_id", "user_id", name="uq_ticket_followers_pair"),
        )
        for column in ("society_id", "ticket_id", "user_id"):
            op.create_index(f"ix_ticket_followers_{column}", "ticket_followers", [column])

    if not inspector.has_table("ticket_updates"):
        op.create_table(
            "ticket_updates",
            *_base("ticket_updates"),
            sa.Column("ticket_id", sa.Uuid(), nullable=False),
            sa.Column("kind", sa.String(14), nullable=False),
            sa.Column("actor_id", sa.Uuid(), nullable=True),
            sa.Column("actor_role", sa.String(9), nullable=False),
            sa.Column("message", sa.String(500), nullable=False),
            _fk("ticket_updates", "ticket_id", "tickets.id"),
            _fk("ticket_updates", "actor_id", "users.id", "SET NULL"),
        )
        op.create_index("ix_ticket_updates_society_id", "ticket_updates", ["society_id"])
        op.create_index("ix_ticket_updates_ticket_id", "ticket_updates", ["ticket_id"])

    if not inspector.has_table("feedback"):
        op.create_table(
            "feedback",
            *_base("feedback"),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("topic", sa.String(10), nullable=False),
            sa.Column("message", sa.String(1000), nullable=False),
            sa.Column("anonymous", sa.Boolean(), nullable=False),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            _fk("feedback", "user_id", "users.id", "SET NULL"),
        )
        op.create_index("ix_feedback_society_id", "feedback", ["society_id"])


def _columns(inspector: sa.Inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    # The baseline create_all already builds current tables and columns on fresh databases.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    _create_help_desk(inspector)

    if "emoji" not in _columns(inspector, "groups"):
        with op.batch_alter_table("groups") as batch:
            batch.add_column(sa.Column("emoji", sa.String(8), nullable=False, server_default="👥"))

    if "post_type" not in _columns(inspector, "posts"):
        with op.batch_alter_table("posts") as batch:
            batch.add_column(
                sa.Column("post_type", sa.String(14), nullable=False, server_default="general")
            )
            batch.add_column(sa.Column("pinned", sa.Boolean(), nullable=False, server_default="0"))
        # Until now every society-feed post was a committee announcement.
        op.execute("UPDATE posts SET post_type = 'notice', pinned = 1 WHERE group_id IS NULL")

    for table, (parent_column, parent) in _BACKFILL.items():
        if "society_id" in _columns(inspector, table):
            continue
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("society_id", sa.Uuid(), nullable=True))
        op.execute(
            f"UPDATE {table} SET society_id = "
            f"(SELECT {parent}.society_id FROM {parent} WHERE {parent}.id = {table}.{parent_column})"
        )
        with op.batch_alter_table(table) as batch:
            batch.alter_column("society_id", existing_type=sa.Uuid(), nullable=False)
            batch.create_foreign_key(
                f"fk_{table}_society_id_societies",
                "societies",
                ["society_id"],
                ["id"],
                ondelete="CASCADE",
            )
            batch.create_index(f"ix_{table}_society_id", ["society_id"])


def downgrade() -> None:
    for table in _BACKFILL:
        with op.batch_alter_table(table) as batch:
            batch.drop_index(f"ix_{table}_society_id")
            batch.drop_constraint(f"fk_{table}_society_id_societies", type_="foreignkey")
            batch.drop_column("society_id")
    with op.batch_alter_table("posts") as batch:
        batch.drop_column("pinned")
        batch.drop_column("post_type")
    with op.batch_alter_table("groups") as batch:
        batch.drop_column("emoji")
    for table in ("feedback", "ticket_updates", "ticket_followers", "tickets", "vendors"):
        op.execute(f"DROP TABLE IF EXISTS {table}")
