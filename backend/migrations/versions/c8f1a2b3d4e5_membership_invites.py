"""membership invites

Revision ID: c8f1a2b3d4e5
Revises: eae80a5f26f4
Create Date: 2026-10-02 14:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8f1a2b3d4e5"
down_revision: Union[str, Sequence[str], None] = "eae80a5f26f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "membership_invites",
        sa.Column("society_id", sa.Uuid(), nullable=False),
        sa.Column("flat_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "owner",
                "tenant",
                "landlord",
                "committee",
                "admin",
                name="membership_role",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "consumed",
                "expired",
                "revoked",
                name="membership_invite_status",
            ),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consumed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["consumed_by_user_id"],
            ["users.id"],
            name=op.f("fk_membership_invites_consumed_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["flat_id"],
            ["flats.id"],
            name=op.f("fk_membership_invites_flat_id_flats"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["society_id"],
            ["societies.id"],
            name=op.f("fk_membership_invites_society_id_societies"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_membership_invites")),
        sa.UniqueConstraint("code", name="uq_membership_invites_code"),
    )
    op.create_index(
        op.f("ix_membership_invites_flat_id"), "membership_invites", ["flat_id"], unique=False
    )
    op.create_index(
        op.f("ix_membership_invites_society_id"),
        "membership_invites",
        ["society_id"],
        unique=False,
    )
    op.create_index(
        "ix_membership_invites_society_id_status",
        "membership_invites",
        ["society_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_membership_invites_society_id_status", table_name="membership_invites")
    op.drop_index(op.f("ix_membership_invites_society_id"), table_name="membership_invites")
    op.drop_index(op.f("ix_membership_invites_flat_id"), table_name="membership_invites")
    op.drop_table("membership_invites")
    op.execute("DROP TYPE IF EXISTS membership_invite_status")
