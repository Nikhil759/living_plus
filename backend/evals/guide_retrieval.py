"""Retrieval-only check of the guide cases: is the expected section in the top passages?

Unanswerable cases only print their best score: retrieval scores of answerable and unanswerable
questions overlap, so the model (not the threshold) decides coverage. The answer-level runner
checks those.

Usage (from backend/, with GEMINI_API_KEY set and the demo society seeded):
    uv run python -m evals.guide_retrieval
"""

import asyncio
from pathlib import Path

import yaml
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.models import Society
from app.rag import embeddings, retrieval

CASES = Path(__file__).parent / "cases.yaml"


def _hit(labels: list[str], expected: list[str]) -> bool:
    return any(label.startswith(prefix) for label in labels for prefix in expected)


async def main() -> None:
    cases = yaml.safe_load(CASES.read_text(encoding="utf-8"))["guide"]
    embedder = embeddings.get_embedder()
    threshold = get_settings().SAARTHI_GUIDE_MIN_SCORE
    top1 = top3 = gated = 0
    async with get_sessionmaker()() as db:
        society_id = await db.scalar(select(Society.id).where(Society.invite_code == "AANGAN50"))
        assert society_id, "Seed the demo society first (scripts/seed.py)."
        for case in cases:
            result = await retrieval.search(db, society_id, case["question"], embedder)
            labels = [p.label for p in result.passages]
            expected = case["cite"]
            best = f"{result.best_cosine:.3f}" if result.best_cosine is not None else "n/a"
            if not expected:
                gated += not result.found
                print(f"INFO no-answer  best={best}  passages={len(labels)}  {case['question']}")
                continue
            first, three = _hit(labels[:1], expected), _hit(labels[:3], expected)
            top1, top3 = top1 + first, top3 + three
            mark = "PASS" if three else "FAIL"
            print(f"{mark} top1={first!s:5} best={best}  {case['question']}  -> {labels[:3]}")
    answerable = sum(1 for c in cases if c["cite"])
    unanswerable = len(cases) - answerable
    print(
        f"\nthreshold {threshold}: top-1 {top1}/{answerable}, top-3 {top3}/{answerable}, "
        f"no-answer cases with no passages {gated}/{unanswerable}"
    )


if __name__ == "__main__":
    asyncio.run(main())
