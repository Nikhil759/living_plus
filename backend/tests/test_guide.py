import hashlib
import math
import re
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import select

from app.auth import get_current_user
from app.core.config import get_settings
from app.main import app
from app.models import (
    Document,
    DocumentChunk,
    LlmCall,
    Membership,
    MembershipRole,
    MembershipStatus,
    Post,
    Society,
    User,
)
from app.models.enums import DocumentSource, DocumentStatus, DocumentType, PostType
from app.rag.chunking import chunk_document, sections, split_front_matter
from app.rag.retrieval import search
from app.services.guide import index_document

GUIDE = Path(__file__).resolve().parent.parent / "seed_data" / "society-guide"
# The sample PDF lives in the repo-root society-guide/ folder; its test is skipped without it.
SAMPLE_PDF = (
    Path(__file__).resolve().parents[2]
    / "society-guide"
    / "Prestige-Meridian-Park-Resident-Handbook.pdf"
)


class FakeEmbedder:
    """Bag-of-words hashing: texts sharing words get similar vectors. Deterministic, offline."""

    model = "fake-embed"

    def __init__(self) -> None:
        self.calls = 0

    async def embed(self, texts: list[str], *, query: bool) -> list[list[float]]:
        self.calls += 1
        out = []
        for text in texts:
            vector = [0.0] * 64
            for word in re.findall(r"[a-z]+", text.lower()):
                vector[int(hashlib.md5(word.encode()).hexdigest(), 16) % 64] += 1
            norm = math.sqrt(sum(v * v for v in vector)) or 1
            out.append([v / norm for v in vector])
        return out


def handbook() -> tuple[dict[str, Any], str]:
    return split_front_matter((GUIDE / "01-resident-handbook.md").read_text(encoding="utf-8"))


# --- chunking --------------------------------------------------------------------------------


def test_handbook_chunks_have_section_labels_and_keep_tables_whole() -> None:
    meta, body = handbook()
    assert meta["doc_type"] == "bylaws" and meta["effective_from"] == date(2026, 9, 1)
    chunks = chunk_document(DocumentType.bylaws, meta["title"], meta["effective_from"], body)
    labels = [c.label for c in chunks]

    assert "Handbook §11.2 Swimming pool" in labels
    assert "Handbook §3 Moving in and moving out (shifting)" in labels
    assert labels[0] == "Handbook: introduction"
    # "## 11. Amenity rules" has no text of its own, only subsections.
    assert not any(label == "Handbook §11 Amenity rules" for label in labels)

    fines = next(c for c in chunks if c.label == "Handbook §21 Fines at a glance")
    assert fines.content.count("|") > 20 and "Lost or replacement access card" in fines.content
    assert fines.anchor == "21-fines-at-a-glance"


def test_minutes_and_notice_labels() -> None:
    meta, body = split_front_matter(
        (GUIDE / "02-agm-minutes-2026-08-24.md").read_text(encoding="utf-8")
    )
    labels = [
        c.label for c in chunk_document(DocumentType.minutes, meta["title"], meta["date"], body)
    ]
    assert "AGM minutes 24 Aug 2026 §6 Amenities" in labels

    meta, body = split_front_matter(
        (GUIDE / "notices" / "2026-10-01-diwali-mela-2026.md").read_text(encoding="utf-8")
    )
    chunks = chunk_document(DocumentType.notice, meta["title"], meta["date"], body)
    assert {c.label for c in chunks} == {
        "Notice: Diwali Mela 2026 and stall applications (1 Oct 2026)"
    }
    assert [c.anchor for c in chunks] == [
        "diwali-mela-2026",
        "stalls-for-residents",
        "firecrackers",
    ]


def test_plain_text_without_headings_is_split_by_paragraph() -> None:
    body = "\n\n".join(f"Paragraph {n}. " + "word " * 120 for n in range(6))
    chunks = chunk_document(DocumentType.other, "Lift AMC contract", None, body)
    assert len(chunks) > 1
    assert all(c.label == "Lift AMC contract" and len(c.content) < 1700 for c in chunks)


def test_sections_give_unique_anchors() -> None:
    found = sections("# Title\n\nIntro\n\n## Rules\nA\n\n## Rules\nB")
    assert [s.anchor for s in found] == ["title", "rules", "rules-2"]


# --- indexing and retrieval ------------------------------------------------------------------


@dataclass
class World:
    society: Society
    other: Society
    resident: User
    committee: User
    outsider: User
    handbook: Document


def _user(name: str) -> User:
    slug = name.lower().replace(" ", ".")
    return User(
        id=uuid.uuid4(), supabase_uid=f"seed:{slug}", email=f"{slug}@example.com", name=name
    )


@pytest.fixture
def embedder(monkeypatch: pytest.MonkeyPatch) -> FakeEmbedder:
    fake = FakeEmbedder()
    monkeypatch.setattr("app.rag.embeddings.get_embedder", lambda: fake)
    # Hashed bag-of-words vectors score lower than real embeddings.
    monkeypatch.setattr(get_settings(), "SAARTHI_GUIDE_MIN_SCORE", 0.2)
    return fake


@pytest.fixture
async def world(db_session, embedder: FakeEmbedder) -> World:
    society = Society(
        id=uuid.uuid4(), name="Prestige Meridian Park", city="Gurugram", invite_code="GD0001"
    )
    other = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="GD0002")
    resident, committee, outsider = _user("Nikhil Bansal"), _user("Meera Sharma"), _user("Out")
    db_session.add_all([society, other, resident, committee, outsider])
    await db_session.flush()
    for user, soc, role in (
        (resident, society, MembershipRole.owner),
        (committee, society, MembershipRole.committee),
        (outsider, other, MembershipRole.committee),
    ):
        db_session.add(
            Membership(
                id=uuid.uuid4(),
                user_id=user.id,
                society_id=soc.id,
                role=role,
                status=MembershipStatus.approved,
            )
        )
    meta, body = handbook()
    doc = Document(
        id=uuid.uuid4(),
        society_id=society.id,
        title=meta["title"],
        doc_type=DocumentType.bylaws,
        source=DocumentSource.seed,
        effective_date=meta["effective_from"],
        body_markdown=body,
    )
    other_doc = Document(
        id=uuid.uuid4(),
        society_id=other.id,
        title="Elsewhere rules",
        doc_type=DocumentType.bylaws,
        source=DocumentSource.seed,
        body_markdown="## 1. Pool\nThe swimming pool is open 24 hours.",
    )
    db_session.add_all([doc, other_doc])
    await db_session.flush()
    await index_document(db_session, doc, embedder)
    await index_document(db_session, other_doc, embedder)
    await db_session.commit()
    return World(society, other, resident, committee, outsider, doc)


async def test_indexing_stores_embedded_chunks_and_logs_the_call(db_session, world) -> None:
    chunks = list(
        await db_session.scalars(
            select(DocumentChunk).where(DocumentChunk.document_id == world.handbook.id)
        )
    )
    assert len(chunks) > 20 and all(c.embedding for c in chunks)
    assert world.handbook.status == DocumentStatus.ready and world.handbook.content_hash
    call = await db_session.scalar(select(LlmCall).where(LlmCall.purpose == "embed"))
    assert call is not None and call.model == "fake-embed" and call.input_tokens > 0


async def test_reindex_replaces_old_chunks(db_session, world, embedder) -> None:
    world.handbook.body_markdown = "## 1. Only section\nEverything else was removed."
    await index_document(db_session, world.handbook, embedder)
    await db_session.commit()
    labels = list(
        await db_session.scalars(
            select(DocumentChunk.label).where(DocumentChunk.document_id == world.handbook.id)
        )
    )
    assert labels == ["Handbook §1 Only section"]


async def test_search_finds_the_section_and_stays_in_the_society(
    db_session, world, embedder
) -> None:
    result = await search(db_session, world.society.id, "swimming pool guests", embedder)
    assert result.found
    assert result.passages[0].label == "Handbook §11.2 Swimming pool"
    assert all(p.document_id == world.handbook.id for p in result.passages)

    elsewhere = await search(db_session, world.other.id, "swimming pool guests", embedder)
    assert [p.document_title for p in elsewhere.passages] == ["Elsewhere rules"]


async def test_search_gates_unrelated_questions(db_session, world, embedder, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "SAARTHI_GUIDE_MIN_SCORE", 0.99)
    result = await search(db_session, world.society.id, "swimming pool guests", embedder)
    assert not result.found and result.passages == []


async def test_keyword_search_works_without_embeddings(db_session, world) -> None:
    result = await search(db_session, world.society.id, "swimming pool guests lifeguard", None)
    assert result.found and result.best_cosine is None
    assert result.passages[0].label == "Handbook §11.2 Swimming pool"


# --- guide API -------------------------------------------------------------------------------


@pytest.fixture
def act_as() -> Iterator[Any]:
    def switch(user: User) -> None:
        async def override() -> User:
            return user

        app.dependency_overrides[get_current_user] = override

    yield switch
    app.dependency_overrides.pop(get_current_user, None)


NOTICE = {
    "title": "Notice: Lift maintenance in Tower A",
    "body": "Lift 1 in Tower A is shut on Friday 9 Oct from 10 AM to 1 PM for servicing.",
}


async def test_list_and_read_documents(client, world, act_as) -> None:
    act_as(world.resident)
    listed = (await client.get("/v1/guide/documents")).json()
    assert [d["title"] for d in listed] == ["Prestige Meridian Park Resident Handbook"]
    assert listed[0]["status"] == "ready" and listed[0]["docType"] == "bylaws"

    detail = (await client.get(f"/v1/guide/documents/{world.handbook.id}")).json()
    pool = next(s for s in detail["sections"] if s["anchor"] == "11-2-swimming-pool")
    assert pool["level"] == 3 and "Monday" in pool["markdown"]


async def test_documents_are_per_society(client, world, act_as) -> None:
    act_as(world.outsider)
    assert [d["title"] for d in (await client.get("/v1/guide/documents")).json()] == [
        "Elsewhere rules"
    ]
    response = await client.get(f"/v1/guide/documents/{world.handbook.id}")
    assert response.status_code == 404
    edit = await client.put(f"/v1/guide/documents/{world.handbook.id}", json=NOTICE)
    assert edit.status_code == 404
    assert (await client.delete(f"/v1/guide/documents/{world.handbook.id}")).status_code == 404


async def test_guide_requires_auth(client) -> None:
    doc_id = uuid.uuid4()
    calls = [
        client.get("/v1/guide/documents"),
        client.get(f"/v1/guide/documents/{doc_id}"),
        client.post("/v1/guide/documents", json=NOTICE),
        client.post("/v1/guide/documents/upload", files={"file": ("a.md", b"# A")}),
        client.put(f"/v1/guide/documents/{doc_id}", json=NOTICE),
        client.delete(f"/v1/guide/documents/{doc_id}"),
    ]
    for call in calls:
        assert (await call).status_code == 401


async def test_committee_adds_a_notice_that_becomes_searchable(
    client, world, act_as, db_session, embedder
) -> None:
    act_as(world.committee)
    response = await client.post("/v1/guide/documents", json=NOTICE)
    assert response.status_code == 202
    created = response.json()
    assert created["status"] == "indexing" and created["source"] == "committee"

    # The background task has run by the time the test client returns.
    act_as(world.resident)
    detail = (await client.get(f"/v1/guide/documents/{created['id']}")).json()
    assert detail["status"] == "ready"
    result = await search(db_session, world.society.id, "Tower A lift shut Friday", embedder)
    assert result.passages[0].label.startswith("Notice: Lift maintenance in Tower A (")

    post = await db_session.scalar(select(Post).where(Post.post_type == PostType.notice))
    assert post.pinned and post.body.startswith("**Lift maintenance in Tower A:** Lift 1")


async def test_edit_reindexes_and_updates_the_notice_post(client, world, act_as, db_session):
    act_as(world.committee)
    created = (await client.post("/v1/guide/documents", json=NOTICE)).json()
    changed = {**NOTICE, "body": "Lift 1 in Tower A is shut on Saturday 10 Oct instead."}
    response = await client.put(f"/v1/guide/documents/{created['id']}", json=changed)
    assert response.status_code == 202

    chunks = list(
        await db_session.scalars(
            select(DocumentChunk.content).where(
                DocumentChunk.document_id == uuid.UUID(created["id"])
            )
        )
    )
    assert len(chunks) == 1 and "Saturday" in chunks[0]
    post = await db_session.scalar(select(Post).where(Post.post_type == PostType.notice))
    await db_session.refresh(post)
    assert "Saturday" in post.body

    assert (await client.delete(f"/v1/guide/documents/{created['id']}")).status_code == 204
    assert await db_session.scalar(select(Post).where(Post.post_type == PostType.notice)) is None
    assert (await client.get(f"/v1/guide/documents/{created['id']}")).status_code == 404


async def test_upload_markdown_and_pdf(client, world, act_as) -> None:
    act_as(world.committee)
    markdown = (GUIDE / "notices" / "2026-10-02-pool-closure.md").read_bytes()
    response = await client.post(
        "/v1/guide/documents/upload", files={"file": ("pool.md", markdown, "text/markdown")}
    )
    assert response.status_code == 202
    body = response.json()
    assert body["title"] == "Notice: Swimming pool closed for filtration upgrade"
    assert body["effectiveDate"] == "2026-10-02"

    pdf = SAMPLE_PDF
    if pdf.exists():  # The sample PDF lives outside backend/; skip quietly when absent.
        response = await client.post(
            "/v1/guide/documents/upload",
            data={"title": "Handbook (PDF)"},
            files={"file": ("handbook.pdf", pdf.read_bytes(), "application/pdf")},
        )
        assert response.status_code == 202
        assert response.json()["title"] == "Handbook (PDF)"


@pytest.mark.parametrize(
    ("filename", "content", "status", "code"),
    [
        ("notes.txt", b"hello there friends", 422, "invalid_file"),
        ("broken.pdf", b"not a pdf at all", 422, "invalid_file"),
        ("big.md", b"# Big\n" + b"x" * (2 * 1024 * 1024 + 10), 413, "file_too_large"),
        ("empty.md", b"# T\n", 422, "invalid_file"),
    ],
)
async def test_upload_validation(client, world, act_as, filename, content, status, code) -> None:
    act_as(world.committee)
    response = await client.post("/v1/guide/documents/upload", files={"file": (filename, content)})
    assert response.status_code == status
    assert response.json()["code"] == code


@pytest.mark.parametrize(
    "body",
    [
        {"title": "ab", "body": NOTICE["body"]},
        {"title": NOTICE["title"], "body": "short"},
        {**NOTICE, "docType": "bylaws"},
        {"title": NOTICE["title"]},
    ],
)
async def test_create_validation(client, world, act_as, body) -> None:
    act_as(world.committee)
    assert (await client.post("/v1/guide/documents", json=body)).status_code == 422


async def test_residents_cannot_change_the_guide(client, world, act_as) -> None:
    act_as(world.resident)
    assert (await client.post("/v1/guide/documents", json=NOTICE)).status_code == 403
    upload = await client.post("/v1/guide/documents/upload", files={"file": ("x.txt", b"x")})
    assert upload.status_code == 403
    doc = f"/v1/guide/documents/{world.handbook.id}"
    assert (await client.put(doc, json=NOTICE)).status_code == 403
    assert (await client.delete(doc)).status_code == 403
