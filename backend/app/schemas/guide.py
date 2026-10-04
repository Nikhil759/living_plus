import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import StringConstraints

from app.models.enums import DocumentSource, DocumentStatus, DocumentType
from app.schemas.base import CamelModel

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=160)]
Body = Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=50_000)]


class DocumentIn(CamelModel):
    title: Title
    body: Body
    # Committee additions are notices or other reference material, never new bylaws.
    doc_type: Literal[DocumentType.notice, DocumentType.other] = DocumentType.notice
    effective_date: date | None = None
    issued_by: Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)] | None = (
        None
    )


class DocumentOut(CamelModel):
    id: uuid.UUID
    title: str
    doc_type: DocumentType
    source: DocumentSource
    effective_date: date | None
    issued_by: str | None
    status: DocumentStatus
    updated_at: datetime


class SectionOut(CamelModel):
    heading: str
    level: int
    anchor: str
    markdown: str


class DocumentDetailOut(DocumentOut):
    sections: list[SectionOut]
    # Raw Markdown for the committee's edit form.
    body_markdown: str
