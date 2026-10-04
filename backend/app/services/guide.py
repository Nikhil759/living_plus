"""Society guide documents: storage, indexing for Saarthi, and committee notices."""

import hashlib
import logging
import time
import uuid
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.db import get_sessionmaker
from app.core.errors import AppError
from app.models import Document, DocumentChunk, Post
from app.models.enums import (
    DocumentSource,
    DocumentStatus,
    DocumentType,
    LlmOutcome,
    LlmPurpose,
    PostType,
)
from app.rag import embeddings
from app.rag.chunking import chunk_document, sections, split_front_matter
from app.rag.pdf import pdf_text
from app.schemas.guide import DocumentDetailOut, DocumentIn, DocumentOut, SectionOut
from app.services import llm_usage
from app.services.business_review import require_committee

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")
MAX_UPLOAD_BYTES = 2 * 1024 * 1024
NOTICE_SUMMARY_CHARS = 180


def content_hash(title: str, body: str) -> str:
    return hashlib.sha256(f"{title}\n{body}".encode()).hexdigest()


# --- indexing --------------------------------------------------------------------------------


async def index_document(
    db: AsyncSession, document: Document, embedder: embeddings.Embedder | None
) -> None:
    """Replaces the document's chunks. Without embeddings the chunks still serve keyword search."""
    chunks = chunk_document(
        document.doc_type, document.title, document.effective_date, document.body_markdown
    )
    vectors: list[list[float] | None] = [None] * len(chunks)
    if embedder is not None and chunks:
        started = time.perf_counter()
        outcome, error = LlmOutcome.ok, None
        try:
            vectors = list(await embedder.embed([c.content for c in chunks], query=False))
        except Exception as exc:
            outcome, error = LlmOutcome.error, type(exc).__name__
            logger.warning("guide embedding failed", extra={"document_id": str(document.id)})
        llm_usage.record_call(
            db,
            society_id=document.society_id,
            user_id=None,
            purpose=LlmPurpose.embed,
            model=embedder.model,
            # The embeddings API reports no usage; ~4 characters per token is close enough.
            input_tokens=sum(len(c.content) for c in chunks) // 4,
            output_tokens=0,
            latency_ms=int((time.perf_counter() - started) * 1000),
            outcome=outcome,
            error_code=error,
            detail={"document_id": str(document.id), "chunks": len(chunks)},
        )
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
    for chunk, vector in zip(chunks, vectors, strict=True):
        db.add(
            DocumentChunk(
                society_id=document.society_id,
                document_id=document.id,
                ordinal=chunk.ordinal,
                heading=chunk.heading[:200],
                anchor=chunk.anchor,
                label=chunk.label[:200],
                content=chunk.content,
                embedding=embeddings.pack(vector) if vector else None,
                embedding_model=embedder.model if vector and embedder else None,
            )
        )
    document.content_hash = content_hash(document.title, document.body_markdown)
    document.status = DocumentStatus.ready
    document.updated_at = datetime.now(UTC)


async def index_in_background(document_id: uuid.UUID) -> None:
    """Runs after the response (FastAPI BackgroundTasks) in its own session."""
    async with get_sessionmaker()() as db:
        document = await db.get(Document, document_id)
        if document is None:
            return
        try:
            await index_document(db, document, embeddings.get_embedder())
        except Exception:
            logger.exception("guide indexing failed", extra={"document_id": str(document_id)})
            await db.rollback()
            document = await db.get(Document, document_id)
            if document is None:
                return
            document.status = DocumentStatus.failed
        await db.commit()


async def guide_version(db: AsyncSession, society_id: uuid.UUID) -> str:
    """Changes whenever a document is added, edited, re-indexed or removed (cache key part)."""
    count, latest = (
        await db.execute(
            select(func.count(Document.id), func.max(Document.updated_at)).where(
                Document.society_id == society_id
            )
        )
    ).one()
    return f"{count}:{latest.isoformat() if latest else ''}"


# --- reading ---------------------------------------------------------------------------------


async def list_documents(db: AsyncSession, member: CurrentMember) -> list[DocumentOut]:
    documents = await db.scalars(
        select(Document)
        .where(Document.society_id == member.society_id)
        .order_by(Document.effective_date.desc().nulls_last(), Document.title)
    )
    return [DocumentOut.model_validate(d) for d in documents]


async def _load(db: AsyncSession, member: CurrentMember, document_id: uuid.UUID) -> Document:
    document = await db.scalar(
        select(Document).where(Document.id == document_id, Document.society_id == member.society_id)
    )
    if document is None:
        raise AppError("not_found", "Document not found.", 404)
    return document


def _detail(document: Document) -> DocumentDetailOut:
    return DocumentDetailOut(
        **DocumentOut.model_validate(document).model_dump(),
        sections=[
            SectionOut(heading=s.heading, level=s.level, anchor=s.anchor, markdown=s.markdown)
            for s in sections(document.body_markdown)
        ],
        body_markdown=document.body_markdown,
    )


async def get_document(
    db: AsyncSession, member: CurrentMember, document_id: uuid.UUID
) -> DocumentDetailOut:
    return _detail(await _load(db, member, document_id))


# --- committee writes ------------------------------------------------------------------------


def _summary(body: str) -> str:
    for section in sections(body):
        for line in section.markdown.splitlines():
            text = line.strip().lstrip("-*> ").strip()
            if text and not text.startswith("|"):
                return text if len(text) <= NOTICE_SUMMARY_CHARS else f"{text[:177]}…"
    return ""


def _notice_body(document: Document) -> str:
    name = document.title.removeprefix("Notice: ").removeprefix("Notice:").strip()
    return f"**{name}:** {_summary(document.body_markdown)}"


async def _sync_notice_post(db: AsyncSession, document: Document, member: CurrentMember) -> None:
    """Committee notices also appear on Home and the Notices page as a pinned notice post."""
    if document.doc_type != DocumentType.notice:
        return
    post = await db.get(Post, document.linked_post_id) if document.linked_post_id else None
    if post is None:
        post = Post(
            society_id=document.society_id,
            author_id=member.user.id,
            body="",
            post_type=PostType.notice,
            pinned=True,
            created_at=datetime.now(UTC),
        )
        db.add(post)
        await db.flush()
        document.linked_post_id = post.id
    post.body = _notice_body(document)


async def create_document(
    db: AsyncSession, member: CurrentMember, body: DocumentIn
) -> DocumentDetailOut:
    require_committee(member)
    document = Document(
        society_id=member.society_id,
        title=body.title,
        doc_type=body.doc_type,
        source=DocumentSource.committee,
        effective_date=body.effective_date or datetime.now(IST).date(),
        issued_by=body.issued_by or "Managing Committee",
        body_markdown=body.body,
        status=DocumentStatus.indexing,
        created_by=member.user.id,
    )
    db.add(document)
    await db.flush()
    await _sync_notice_post(db, document, member)
    await db.commit()
    await db.refresh(document)  # timestamps are set by the database
    return _detail(document)


def parse_upload(filename: str, data: bytes, title: str | None) -> DocumentIn:
    """Markdown (front matter optional) or PDF text, validated like a typed notice."""
    if len(data) > MAX_UPLOAD_BYTES:
        raise AppError("file_too_large", "Files must be 2 MB or smaller.", 413)
    name = filename.lower()
    if name.endswith((".md", ".markdown")):
        try:
            meta, body = split_front_matter(data.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            raise AppError("invalid_file", "That Markdown file couldn't be read.", 422) from None
        title = title or str(meta.get("title") or "")
        when = meta.get("date") or meta.get("effective_from")
        effective = when if isinstance(when, date) else None
    elif name.endswith(".pdf"):
        body, effective = pdf_text(data), None
    else:
        raise AppError("invalid_file", "Upload a .md or .pdf file.", 422)
    try:
        return DocumentIn(
            title=title or filename.rsplit(".", 1)[0], body=body, effective_date=effective
        )
    except ValueError:
        raise AppError("invalid_file", "The file needs a title and some text.", 422) from None


async def upload_document(
    db: AsyncSession, member: CurrentMember, filename: str, data: bytes, title: str | None
) -> DocumentDetailOut:
    require_committee(member)
    return await create_document(db, member, parse_upload(filename, data, title))


async def update_document(
    db: AsyncSession, member: CurrentMember, document_id: uuid.UUID, body: DocumentIn
) -> DocumentDetailOut:
    require_committee(member)
    document = await _load(db, member, document_id)
    document.title, document.body_markdown = body.title, body.body
    if body.effective_date:
        document.effective_date = body.effective_date
    if body.issued_by:
        document.issued_by = body.issued_by
    document.status = DocumentStatus.indexing
    await _sync_notice_post(db, document, member)
    await db.commit()
    await db.refresh(document)
    return _detail(document)


async def delete_document(db: AsyncSession, member: CurrentMember, document_id: uuid.UUID) -> None:
    require_committee(member)
    document = await _load(db, member, document_id)
    if document.linked_post_id:
        await db.execute(delete(Post).where(Post.id == document.linked_post_id))
    await db.delete(document)
    await db.commit()
