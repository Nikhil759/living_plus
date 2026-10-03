"""marketplace listings and reports

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-10-03 15:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e0f1a2b3c4d5"
down_revision: Union[str, Sequence[str], None] = "d9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    ]


def _fk(column: str, target: str, name: str, ondelete: str = "CASCADE") -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint([column], [target], name=name, ondelete=ondelete)


def upgrade() -> None:
    # The baseline create_all already builds these tables on fresh databases.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("marketplace_listings"):
        op.create_table(
            "marketplace_listings",
            sa.Column("id", sa.Uuid(), nullable=False),
            *_timestamps(),
            sa.Column("society_id", sa.Uuid(), nullable=False),
            sa.Column("seller_id", sa.Uuid(), nullable=False),
            sa.Column("title", sa.String(60), nullable=False),
            sa.Column("description", sa.String(500), nullable=True),
            sa.Column("category", sa.String(12), nullable=False),
            sa.Column("condition", sa.String(8), nullable=False),
            sa.Column("price_inr", sa.Integer(), nullable=False),
            sa.Column("negotiable", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("photos", sa.JSON(), nullable=False),
            sa.Column("contact_method", sa.String(8), nullable=False),
            sa.Column("pickup_note", sa.String(120), nullable=False),
            sa.Column("status", sa.String(9), nullable=False),
            sa.Column("listed_at", sa.DateTime(), nullable=False),
            sa.Column("removed_reason", sa.Text(), nullable=True),
            sa.Column("removed_by_id", sa.Uuid(), nullable=True),
            _fk("society_id", "societies.id", "fk_marketplace_listings_society_id_societies"),
            _fk("seller_id", "users.id", "fk_marketplace_listings_seller_id_users"),
            _fk(
                "removed_by_id",
                "users.id",
                "fk_marketplace_listings_removed_by_id_users",
                "SET NULL",
            ),
            sa.PrimaryKeyConstraint("id", name="pk_marketplace_listings"),
        )
        op.create_index("ix_marketplace_listings_society_id", "marketplace_listings", ["society_id"])
        op.create_index("ix_marketplace_listings_seller_id", "marketplace_listings", ["seller_id"])
        op.create_index(
            "ix_marketplace_listings_feed",
            "marketplace_listings",
            ["society_id", "status", "listed_at"],
        )
    if not inspector.has_table("marketplace_listing_reports"):
        op.create_table(
            "marketplace_listing_reports",
            sa.Column("id", sa.Uuid(), nullable=False),
            *_timestamps(),
            sa.Column("listing_id", sa.Uuid(), nullable=False),
            sa.Column("society_id", sa.Uuid(), nullable=False),
            sa.Column("reporter_id", sa.Uuid(), nullable=False),
            sa.Column("reason", sa.String(200), nullable=False),
            _fk(
                "listing_id",
                "marketplace_listings.id",
                "fk_marketplace_listing_reports_listing_id_marketplace_listings",
            ),
            _fk(
                "society_id", "societies.id", "fk_marketplace_listing_reports_society_id_societies"
            ),
            _fk("reporter_id", "users.id", "fk_marketplace_listing_reports_reporter_id_users"),
            sa.PrimaryKeyConstraint("id", name="pk_marketplace_listing_reports"),
            sa.UniqueConstraint(
                "listing_id", "reporter_id", name="uq_listing_reports_listing_reporter"
            ),
        )
        for column in ("listing_id", "society_id", "reporter_id"):
            op.create_index(
                f"ix_marketplace_listing_reports_{column}",
                "marketplace_listing_reports",
                [column],
            )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS marketplace_listing_reports")
    op.execute("DROP TABLE IF EXISTS marketplace_listings")
