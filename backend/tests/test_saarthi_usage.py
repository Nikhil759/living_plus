"""Committee AI usage page: daily aggregates, feedback, unanswered questions, access and scoping."""

import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import select

from app.models import (
    ChatMessage,
    ChatSession,
    LlmCall,
    Membership,
    Society,
    User,
)
from app.models.enums import ChatFeedback, ChatRole, LlmOutcome, LlmPurpose
from app.services.llm_usage import _percentile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed


@pytest.fixture
async def people(db_session) -> dict[str, User]:
    await seed.run_seed()
    users = {u.email: u for u in await db_session.scalars(select(User))}
    return {"nikhil": users["demo@aangan.app"], "committee": users["committee@aangan.app"]}


def _call(society_id, latency: int, *, purpose=LlmPurpose.chat, ago=timedelta(0), **detail):  # type: ignore[no-untyped-def]
    return LlmCall(
        id=uuid.uuid4(),
        society_id=society_id,
        purpose=purpose,
        model="gemini-3.8-flash",
        input_tokens=1000,
        output_tokens=200,
        cost_usd=0.0015,
        latency_ms=latency,
        outcome=LlmOutcome.error if detail.pop("failed", False) else LlmOutcome.ok,
        detail=detail,
        created_at=datetime.now(UTC) - ago,
    )


@pytest.fixture
async def usage_data(db_session, people) -> uuid.UUID:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == people["nikhil"].id)
    )
    sid = membership.society_id
    db_session.add_all(
        [
            *(_call(sid, ms) for ms in (800, 1200, 2000, 9000)),
            _call(sid, 1500, purpose=LlmPurpose.fill),
            _call(sid, 500, failed=True),
            _call(sid, 1000, unanswered=True, question="Solar panels on balconies?"),
            _call(sid, 1000, unanswered=True, question="solar panels on balconies"),
            _call(sid, 1000, unanswered=True, question="Can I keep a cow?"),
            _call(sid, 700, ago=timedelta(days=3)),
            _call(sid, 700, ago=timedelta(days=40)),  # outside the window
            _call(sid, 1, purpose=LlmPurpose.embed),  # indexing: cost only, not a request
        ]
    )
    other = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="USAGE2")
    db_session.add(other)
    await db_session.flush()
    db_session.add(_call(other.id, 99_999))
    chat = ChatSession(
        id=uuid.uuid4(),
        society_id=sid,
        user_id=people["nikhil"].id,
        title="t",
        last_message_at=datetime.now(UTC),
    )
    db_session.add(chat)
    await db_session.flush()
    for feedback in (ChatFeedback.up, ChatFeedback.up, ChatFeedback.up, ChatFeedback.down):
        db_session.add(
            ChatMessage(
                id=uuid.uuid4(),
                society_id=sid,
                session_id=chat.id,
                role=ChatRole.assistant,
                content="answer",
                feedback=feedback,
            )
        )
    await db_session.commit()
    return sid


async def test_committee_sees_usage(client, people, usage_data, act_as) -> None:
    act_as(people["committee"])
    response = await client.get("/v1/saarthi/usage", params={"days": 14})
    assert response.status_code == 200, response.text
    out = response.json()
    today = out["today"]
    assert today["requests"] == 9  # this society's calls today only
    assert today["errors"] == 1
    assert today["inputTokens"] == 10000 and today["costUsd"] == pytest.approx(0.015)
    assert today["costInr"] == pytest.approx(0.015 * 88, abs=0.01)
    assert today["p50Ms"] == 1000 and today["p95Ms"] == 9000
    assert len(out["days"]) == 14 and sum(d["requests"] for d in out["days"]) == 10
    assert {p["purpose"]: p["requests"] for p in out["byPurpose"]} == {
        "chat": 9,
        "fill": 1,
        "embed": 1,
    }
    assert out["feedback"] == {"up": 3, "down": 1, "upRatio": 0.75}
    top = out["unanswered"][0]
    assert top["count"] == 2 and "solar" in top["question"].lower()
    assert [u["count"] for u in out["unanswered"]] == [2, 1]


async def test_residents_cannot_see_usage(client, people, usage_data, act_as) -> None:
    act_as(people["nikhil"])
    response = await client.get("/v1/saarthi/usage")
    assert response.status_code == 403 and response.json()["code"] == "forbidden"


async def test_usage_requires_auth(client) -> None:
    assert (await client.get("/v1/saarthi/usage")).status_code == 401


@pytest.mark.parametrize("days", [0, 91, "week"])
async def test_usage_days_validation(client, people, act_as, days) -> None:
    act_as(people["committee"])
    assert (await client.get("/v1/saarthi/usage", params={"days": days})).status_code == 422


def test_percentile_nearest_rank() -> None:
    assert _percentile([], 0.5) == 0
    assert _percentile([100], 0.95) == 100
    assert _percentile(list(range(1, 101)), 0.95) == 95
