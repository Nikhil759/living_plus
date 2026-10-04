import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, LargeBinary, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin
from app.models.enums import DocumentSource, DocumentStatus, DocumentType
from app.models.types import enum_column


class Document(Base, IdTimestampMixin):
    """A society guide document (handbook, minutes, notice). Saarthi answers rules from these."""

    __tablename__ = "documents"

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    doc_type: Mapped[DocumentType] = mapped_column(enum_column(DocumentType, "document_type"))
    source: Mapped[DocumentSource] = mapped_column(enum_column(DocumentSource, "document_source"))
    # Notice date, minutes date or the date a bylaw version takes effect.
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    issued_by: Mapped[str | None] = mapped_column(String(160), nullable=True)
    body_markdown: Mapped[str] = mapped_column(Text)
    # sha256 of title + body; indexing is skipped when it hasn't changed.
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[DocumentStatus] = mapped_column(
        enum_column(DocumentStatus, "document_status"), default=DocumentStatus.indexing
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # The Home notice post created for a committee notice.
    linked_post_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("posts.id", ondelete="SET NULL"), nullable=True
    )


class DocumentChunk(Base, IdTimestampMixin):
    __tablename__ = "document_chunks"
    __table_args__ = (Index("ix_document_chunks_document", "document_id", "ordinal"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE")
    )
    ordinal: Mapped[int] = mapped_column(Integer)
    heading: Mapped[str] = mapped_column(String(200))
    anchor: Mapped[str] = mapped_column(String(120))
    # Citation label shown on chips, e.g. "Handbook §11.2 Swimming pool".
    label: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    # L2-normalised float32 vector; NULL until embedded (keyword search still works).
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(60), nullable=True)
