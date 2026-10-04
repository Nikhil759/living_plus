"""saarthi actions (proposals and audit), chat message action link, event invite interest

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-10-04 21:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _fk(table: str, column: str, target: str, ondelete: str = "CASCADE") -> sa.ForeignKeyConstraint:
    ref_table = target.split(".")[0]
    return sa.ForeignKeyConstraint(
        [column], [target], name=f"fk_{table}_{column}_{ref_table}", ondelete=ondelete
    )


def _columns(inspector: sa.Inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    # The baseline create_all already builds current tables and columns on fresh databases.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("saarthi_actions"):
        op.create_table(
            "saarthi_actions",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("society_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("session_id", sa.Uuid(), nullable=False),
            sa.Column("tool", sa.String(60), nullable=False),
            sa.Column("payload", sa.JSON(), nullable=False),
            sa.Column("card", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(16), nullable=False),
            sa.Column("result", sa.JSON(), nullable=False),
            sa.Column("error", sa.String(300), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("decided_at", sa.DateTime(), nullable=True),
            _fk("saarthi_actions", "society_id", "societies.id"),
            _fk("saarthi_actions", "user_id", "users.id"),
            _fk("saarthi_actions", "session_id", "chat_sessions.id"),
            sa.PrimaryKeyConstraint("id", name="pk_saarthi_actions"),
        )
        op.create_index("ix_saarthi_actions_society_id", "saarthi_actions", ["society_id"])
        op.create_index(
            "ix_saarthi_actions_user", "saarthi_actions", ["society_id", "user_id", "created_at"]
        )

    if "action_id" not in _columns(inspector, "chat_messages"):
        with op.batch_alter_table("chat_messages") as batch:
            batch.add_column(sa.Column("action_id", sa.Uuid(), nullable=True))
            batch.create_foreign_key(
                "fk_chat_messages_action_id_saarthi_actions",
                "saarthi_actions",
                ["action_id"],
                ["id"],
                ondelete="SET NULL",
            )

    if "invite_interest" not in _columns(inspector, "events"):
        with op.batch_alter_table("events") as batch:
            batch.add_column(sa.Column("invite_interest", sa.String(40), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("events") as batch:
        batch.drop_column("invite_interest")
    with op.batch_alter_table("chat_messages") as batch:
        batch.drop_constraint("fk_chat_messages_action_id_saarthi_actions", type_="foreignkey")
        batch.drop_column("action_id")
    op.execute("DROP TABLE IF EXISTS saarthi_actions")
