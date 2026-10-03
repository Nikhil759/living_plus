"""local businesses, updates, follows, recommendations and notifications

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-10-03 16:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e0f1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    ]


def _fk(column: str, target: str, table: str) -> sa.ForeignKeyConstraint:
    ref_table = target.split(".")[0]
    return sa.ForeignKeyConstraint(
        [column], [target], name=f"fk_{table}_{column}_{ref_table}", ondelete="CASCADE"
    )


def _index(table: str, *columns: str) -> None:
    op.create_index(f"ix_{table}_{'_'.join(columns)}", table, list(columns))


def _create_businesses() -> None:
    op.create_table(
        "local_businesses",
        *_base_columns(),
        sa.Column("society_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("category", sa.String(13), nullable=False),
        sa.Column("tagline", sa.String(80), nullable=False),
        sa.Column("about", sa.String(600), nullable=True),
        sa.Column("cover_url", sa.String(2048), nullable=False),
        sa.Column("photos", sa.JSON(), nullable=False),
        sa.Column("offerings", sa.JSON(), nullable=False),
        sa.Column("timings", sa.String(80), nullable=False),
        sa.Column("days", sa.JSON(), nullable=False),
        sa.Column("serves", sa.String(14), nullable=False),
        sa.Column("contact_method", sa.String(8), nullable=False),
        sa.Column("availability", sa.String(13), nullable=False),
        sa.Column("review_status", sa.String(8), nullable=False),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("removed_reason", sa.Text(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), server_default="0", nullable=False),
        _fk("society_id", "societies.id", "local_businesses"),
        _fk("owner_id", "users.id", "local_businesses"),
        sa.PrimaryKeyConstraint("id", name="pk_local_businesses"),
    )
    _index("local_businesses", "society_id")
    _index("local_businesses", "owner_id")
    op.create_index("ix_local_businesses_feed", "local_businesses", ["society_id", "review_status"])


def _create_child(table: str, *extra: sa.Column | sa.schema.Constraint) -> None:
    op.create_table(
        table,
        *_base_columns(),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("society_id", sa.Uuid(), nullable=False),
        *extra,
        _fk("business_id", "local_businesses.id", table),
        _fk("society_id", "societies.id", table),
        sa.PrimaryKeyConstraint("id", name=f"pk_{table}"),
    )
    _index(table, "business_id")
    _index(table, "society_id")


def upgrade() -> None:
    # The baseline create_all already builds these tables on fresh databases.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("local_businesses"):
        _create_businesses()
    if not inspector.has_table("local_business_updates"):
        _create_child("local_business_updates", sa.Column("text", sa.String(280), nullable=False))
    if not inspector.has_table("local_business_follows"):
        _create_child(
            "local_business_follows",
            sa.Column("user_id", sa.Uuid(), nullable=False),
            _fk("user_id", "users.id", "local_business_follows"),
            sa.UniqueConstraint("business_id", "user_id", name="uq_business_follows_business_user"),
        )
        _index("local_business_follows", "user_id")
    if not inspector.has_table("local_business_recommendations"):
        _create_child(
            "local_business_recommendations",
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("note", sa.String(140), nullable=True),
            sa.Column("note_removed_reason", sa.Text(), nullable=True),
            _fk("user_id", "users.id", "local_business_recommendations"),
            sa.UniqueConstraint(
                "business_id", "user_id", name="uq_business_recommendations_business_user"
            ),
        )
        _index("local_business_recommendations", "user_id")
    if not inspector.has_table("notifications"):
        op.create_table(
            "notifications",
            *_base_columns(),
            sa.Column("society_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("kind", sa.String(30), nullable=False),
            sa.Column("title", sa.String(120), nullable=False),
            sa.Column("body", sa.String(300), nullable=False),
            sa.Column("href", sa.String(200), nullable=True),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            _fk("society_id", "societies.id", "notifications"),
            _fk("user_id", "users.id", "notifications"),
            sa.PrimaryKeyConstraint("id", name="pk_notifications"),
        )
        _index("notifications", "society_id")
        _index("notifications", "user_id")
        op.create_index("ix_notifications_inbox", "notifications", ["user_id", "created_at"])


def downgrade() -> None:
    for table in (
        "notifications",
        "local_business_recommendations",
        "local_business_follows",
        "local_business_updates",
        "local_businesses",
    ):
        op.execute(f"DROP TABLE IF EXISTS {table}")
