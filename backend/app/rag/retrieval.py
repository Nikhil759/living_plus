"""Hybrid search over one society's guide: embedding cosine + BM25 keywords, rank-fused.

A society's guide is a few hundred chunks at most, so scoring happens in Python.
"""

import logging
import math
import re
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Document, DocumentChunk
from app.models.enums import DocumentType
from app.rag.embeddings import Embedder, unpack

logger = logging.getLogger(__name__)

TOP_K = 5
RRF_K = 60
# Common English and Hinglish filler words that would only add noise to keyword matches.
_STOPWORDS = frozenset(
    {
        "a", "an", "and", "are", "at", "be", "by", "can", "do", "for", "from", "how", "i",
        "in", "is", "it", "my", "of", "on", "or", "the", "to", "we", "what", "when", "where",
        "which", "who", "will", "with", "you", "your", "kya", "hai", "ka", "ki", "ke", "ko",
        "se", "mein",
    }
)


@dataclass(frozen=True)
class Passage:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    doc_type: DocumentType
    doc_date: date | None
    label: str
    anchor: str
    content: str
    cosine: float | None
    keyword: float


@dataclass(frozen=True)
class SearchResult:
    passages: list[Passage]
    found: bool
    best_cosine: float | None
    best_keyword: float


def tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9₹]+", text.lower()) if t not in _STOPWORDS]


def bm25(query: list[str], docs: list[list[str]], k1: float = 1.5, b: float = 0.75) -> list[float]:
    if not docs:
        return []
    avg = sum(len(d) for d in docs) / len(docs) or 1.0
    df = Counter(term for doc in docs for term in set(doc))
    scores = []
    for doc in docs:
        counts = Counter(doc)
        score = 0.0
        for term in set(query):
            if term not in counts:
                continue
            idf = math.log(1 + (len(docs) - df[term] + 0.5) / (df[term] + 0.5))
            tf = counts[term]
            score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * len(doc) / avg))
        scores.append(score)
    return scores


def _ranks(scores: list[float | None]) -> dict[int, int]:
    """Rank position of every positively scored item (0 = best)."""
    positive = [(score, i) for i, score in enumerate(scores) if score is not None and score > 0]
    return {i: rank for rank, (_, i) in enumerate(sorted(positive, reverse=True))}


async def search(
    db: AsyncSession, society_id: uuid.UUID, query: str, embedder: Embedder | None
) -> SearchResult:
    rows = (
        await db.execute(
            select(DocumentChunk, Document)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(DocumentChunk.society_id == society_id, Document.society_id == society_id)
        )
    ).all()
    if not rows:
        return SearchResult([], False, None, 0.0)

    keyword = bm25(tokens(query), [tokens(chunk.content) for chunk, _ in rows])
    cosine: list[float | None] = [None] * len(rows)
    if embedder is not None and any(chunk.embedding for chunk, _ in rows):
        try:
            [query_vector] = await embedder.embed([query], query=True)
            for i, (chunk, _) in enumerate(rows):
                vector = unpack(chunk.embedding) if chunk.embedding else []
                # Vectors from a different embedding size (model change) are skipped.
                if len(vector) == len(query_vector):
                    cosine[i] = sum(a * b for a, b in zip(query_vector, vector, strict=True))
        except Exception:
            logger.warning("query embedding failed; using keyword search only")

    vector_ranks, keyword_ranks = _ranks(cosine), _ranks(list(keyword))
    fused = {
        i: sum(1 / (RRF_K + ranks[i]) for ranks in (vector_ranks, keyword_ranks) if i in ranks)
        for i in range(len(rows))
    }
    top = sorted((i for i in fused if fused[i] > 0), key=lambda i: -fused[i])[:TOP_K]

    settings = get_settings()
    scored = [c for c in cosine if c is not None]
    best_cosine = max(scored) if scored else None
    best_keyword = max(keyword, default=0.0)
    found = (
        best_cosine >= settings.SAARTHI_GUIDE_MIN_SCORE
        if best_cosine is not None
        else best_keyword >= settings.SAARTHI_GUIDE_KEYWORD_FLOOR
    )
    passages = [
        Passage(
            chunk_id=rows[i][0].id,
            document_id=rows[i][1].id,
            document_title=rows[i][1].title,
            doc_type=rows[i][1].doc_type,
            doc_date=rows[i][1].effective_date,
            label=rows[i][0].label,
            anchor=rows[i][0].anchor,
            content=rows[i][0].content,
            cosine=cosine[i],
            keyword=keyword[i],
        )
        for i in top
    ]
    return SearchResult(passages if found else [], found, best_cosine, best_keyword)
