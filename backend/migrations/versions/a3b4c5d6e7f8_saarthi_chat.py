"""saarthi chat sessions, messages and llm calls

Revision ID: a3b4c5d6e7f8
Revises: a2b3c4d5e6f7
Create Date: 2026-10-04 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _fk(table: str, column: str, target: str, ondelete: str = "CASCADE") -> sa.ForeignKeyConstraint:
    ref_table = target.split(".")[0]
    return sa.ForeignKeyConstraint(
        [column], [target], name=f"fk_{table}_{column}_{ref_table}", ondelete=ondelete
    )


def _base_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("society_id", sa.Uuid(), nullable=False),
    ]


def upgrade() -> None:
    # The baseline create_all already builds these tables on fresh databases.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("chat_sessions"):
        op.create_table(
            "chat_sessions",
            *_base_columns(),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("title", sa.String(80), nullable=False),
            sa.Column("last_message_at", sa.DateTime(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            _fk("chat_sessions", "society_id", "societies.id"),
            _fk("chat_sessions", "user_id", "users.id"),
            sa.PrimaryKeyConstraint("id", name="pk_chat_sessions"),
        )
        op.create_index("ix_chat_sessions_society_id", "chat_sessions", ["society_id"])
        op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])
        op.create_index(
            "ix_chat_sessions_recent", "chat_sessions", ["society_id", "user_id", "last_message_at"]
        )

    if not inspector.has_table("chat_messages"):
        op.create_table(
            "chat_messages",
            *_base_columns(),
            sa.Column("session_id", sa.Uuid(), nullable=False),
            sa.Column("role", sa.String(9), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("citations", sa.JSON(), nullable=False),
            sa.Column("cards", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(5), nullable=False),
            sa.Column("feedback", sa.String(4), nullable=True),
            sa.Column("feedback_reason", sa.String(500), nullable=True),
            _fk("chat_messages", "society_id", "societies.id"),
            _fk("chat_messages", "session_id", "chat_sessions.id"),
            sa.PrimaryKeyConstraint("id", name="pk_chat_messages"),
        )
        op.create_index("ix_chat_messages_society_id", "chat_messages", ["society_id"])
        op.create_index("ix_chat_messages_session", "chat_messages", ["session_id", "created_at"])

    if not inspector.has_table("llm_calls"):
        op.create_table(
            "llm_calls",
            *_base_columns(),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("session_id", sa.Uuid(), nullable=True),
            sa.Column("message_id", sa.Uuid(), nullable=True),
            sa.Column("purpose", sa.String(7), nullable=False),
            sa.Column("model", sa.String(60), nullable=False),
            sa.Column("input_tokens", sa.Integer(), nullable=False),
            sa.Column("output_tokens", sa.Integer(), nullable=False),
            sa.Column("cost_usd", sa.Numeric(12, 6), nullable=False),
            sa.Column("latency_ms", sa.Integer(), nullable=False),
            sa.Column("outcome", sa.String(8), nullable=False),
            sa.Column("error_code", sa.String(60), nullable=True),
            sa.Column("trace_id", sa.String(64), nullable=True),
            sa.Column("detail", sa.JSON(), nullable=False),
            _fk("llm_calls", "society_id", "societies.id"),
            _fk("llm_calls", "user_id", "users.id", "SET NULL"),
            _fk("llm_calls", "session_id", "chat_sessions.id", "SET NULL"),
            _fk("llm_calls", "message_id", "chat_messages.id", "SET NULL"),
            sa.PrimaryKeyConstraint("id", name="pk_llm_calls"),
        )
        op.create_index("ix_llm_calls_society_id", "llm_calls", ["society_id"])
        op.create_index("ix_llm_calls_daily", "llm_calls", ["society_id", "created_at"])


def downgrade() -> None:
    for table in ("llm_calls", "chat_messages", "chat_sessions"):
        op.execute(f"DROP TABLE IF EXISTS {table}")
