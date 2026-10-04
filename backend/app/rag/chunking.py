"""Splits society guide Markdown into cited sections.

Sections break on #, ## and ### headings only, so tables and lists always stay inside
the section they belong to. Each chunk carries the citation label residents see on chips.
"""

import re
from dataclasses import dataclass
from datetime import date
from typing import Any

import yaml

from app.models.enums import DocumentType

MAX_PLAIN_CHUNK = 1500
_HEADING = re.compile(r"^(#{1,3})\s+(.+?)\s*#*\s*$")
_NUMBERED = re.compile(r"^(\d+(?:\.\d+)*)\.?\s+(.+)$")


@dataclass(frozen=True)
class Section:
    heading: str
    level: int  # 0 for text before any heading
    anchor: str
    markdown: str  # body without the heading line


@dataclass(frozen=True)
class Chunk:
    ordinal: int
    heading: str
    anchor: str
    label: str
    content: str


def split_front_matter(text: str) -> tuple[dict[str, Any], str]:
    """YAML front matter between leading '---' lines, then the Markdown body."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, flags=re.DOTALL)
    if not match:
        return {}, text
    meta = yaml.safe_load(match.group(1)) or {}
    return (meta if isinstance(meta, dict) else {}), text[match.end():]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:100] or "section"


def sections(body: str) -> list[Section]:
    """Every heading section of the document, in order (used by chunking and the reader)."""
    found: list[tuple[str, int, list[str]]] = [("", 0, [])]
    for line in body.splitlines():
        match = _HEADING.match(line)
        if match:
            found.append((match.group(2).strip(), len(match.group(1)), []))
        else:
            found[-1][2].append(line)
    out: list[Section] = []
    used: dict[str, int] = {}
    for heading, level, lines in found:
        markdown = "\n".join(lines).strip()
        if level == 0 and not markdown:
            continue
        base = slugify(heading) if heading else "introduction"
        used[base] = used.get(base, 0) + 1
        anchor = base if used[base] == 1 else f"{base}-{used[base]}"
        out.append(Section(heading=heading, level=level, anchor=anchor, markdown=markdown))
    return out


def _short_date(value: date | None) -> str:
    return f"{value.day} {value:%b %Y}" if value else ""


def _numbered(heading: str) -> str:
    match = _NUMBERED.match(heading)
    return f"§{match.group(1)} {match.group(2)}" if match else heading


def citation_label(
    doc_type: DocumentType, title: str, effective_date: date | None, section: Section
) -> str:
    when = _short_date(effective_date)
    if doc_type == DocumentType.notice:
        name = re.sub(r"^notice:\s*", "", title, flags=re.IGNORECASE)
        return f"Notice: {name} ({when})" if when else f"Notice: {name}"
    # Top-level (#) headings repeat the document title, so they cite the document itself.
    part = _numbered(section.heading) if section.level >= 2 else "introduction"
    if doc_type == DocumentType.bylaws:
        return f"Handbook {part}" if part.startswith("§") else f"Handbook: {part}"
    if doc_type == DocumentType.minutes:
        prefix = "AGM minutes" if "general meeting" in title.lower() else "Minutes"
        prefix = f"{prefix} {when}".strip()
        return f"{prefix} {part}" if part.startswith("§") else f"{prefix}: {part}"
    return title if section.level < 2 else f"{title} · {section.heading}"


def _plain_pieces(text: str) -> list[str]:
    """Paragraph-packed pieces for long documents without headings (e.g. PDFs)."""
    pieces: list[str] = []
    current = ""
    for paragraph in re.split(r"\n\s*\n", text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if current and len(current) + len(paragraph) > MAX_PLAIN_CHUNK:
            pieces.append(current)
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}" if current else paragraph
    if current:
        pieces.append(current)
    return pieces


def chunk_document(
    doc_type: DocumentType, title: str, effective_date: date | None, body: str
) -> list[Chunk]:
    chunks: list[Chunk] = []
    for section in sections(body):
        if not section.markdown:
            continue  # e.g. "## 11. Amenity rules" whose content lives in ### subsections
        label = citation_label(doc_type, title, effective_date, section)
        heading = section.heading or title
        pieces = (
            _plain_pieces(section.markdown)
            if len(section.markdown) > MAX_PLAIN_CHUNK and section.level == 0
            else [section.markdown]
        )
        for piece in pieces:
            chunks.append(
                Chunk(
                    ordinal=len(chunks),
                    heading=heading,
                    anchor=section.anchor,
                    label=label,
                    content=f"{heading}\n\n{piece}",
                )
            )
    return chunks
