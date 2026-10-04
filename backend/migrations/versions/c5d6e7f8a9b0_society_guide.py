"""society guide documents and chunks

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-04 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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


def upgrade() -> None:
    # The baseline create_all already builds these tables on fresh databases.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("documents"):
        op.create_table(
            "documents",
            *_base("documents"),
            sa.Column("title", sa.String(160), nullable=False),
            sa.Column("doc_type", sa.String(7), nullable=False),
            sa.Column("source", sa.String(9), nullable=False),
            sa.Column("effective_date", sa.Date(), nullable=True),
            sa.Column("issued_by", sa.String(160), nullable=True),
            sa.Column("body_markdown", sa.Text(), nullable=False),
            sa.Column("content_hash", sa.String(64), nullable=True),
            sa.Column("status", sa.String(8), nullable=False),
            sa.Column("created_by", sa.Uuid(), nullable=True),
            sa.Column("linked_post_id", sa.Uuid(), nullable=True),
            _fk("documents", "created_by", "users.id", "SET NULL"),
            _fk("documents", "linked_post_id", "posts.id", "SET NULL"),
        )
        op.create_index("ix_documents_society_id", "documents", ["society_id"])

    if not inspector.has_table("document_chunks"):
        op.create_table(
            "document_chunks",
            *_base("document_chunks"),
            sa.Column("document_id", sa.Uuid(), nullable=False),
            sa.Column("ordinal", sa.Integer(), nullable=False),
            sa.Column("heading", sa.String(200), nullable=False),
            sa.Column("anchor", sa.String(120), nullable=False),
            sa.Column("label", sa.String(200), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("embedding", sa.LargeBinary(), nullable=True),
            sa.Column("embedding_model", sa.String(60), nullable=True),
            _fk("document_chunks", "document_id", "documents.id"),
        )
        op.create_index("ix_document_chunks_society_id", "document_chunks", ["society_id"])
        op.create_index(
            "ix_document_chunks_document", "document_chunks", ["document_id", "ordinal"]
        )


def downgrade() -> None:
    for table in ("document_chunks", "documents"):
        op.execute(f"DROP TABLE IF EXISTS {table}")
