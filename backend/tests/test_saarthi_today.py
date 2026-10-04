"""Home "Today" summary: live facts, daily cache keyed on what changed, scoping and failures."""

import sys
import uuid
from pathlib import Path
from typing import Any

import pytest
from langchain_core.messages import AIMessage
from sqlalchemy import select

from app.agents.llm import ChatModels, NamedModel, get_chat_models
from app.main import app
from app.models import Flat, LlmCall, MembershipRole, Society, Tower, User
from app.services.saarthi_today import QUIET_DAY
from tests.test_help_desk_api import _member, _user

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed

SUMMARY = "Water is off in Tower B on Tuesday afternoon. The FIFA tournament is nearly full."


class FakeWriter:
    def __init__(self) -> None:
        self.prompts: list[str] = []
        self.fail = False

    async def ainvoke(self, messages: list[Any]) -> AIMessage:
        self.prompts.append("\n".join(str(m.content) for m in messages))
        if self.fail:
            raise RuntimeError("provider down")
        usage = {"input_tokens": 400, "output_tokens": 50, "total_tokens": 450}
        return AIMessage(SUMMARY, usage_metadata=usage)


@pytest.fixture
def fake() -> Any:
    writer = FakeWriter()
    models = ChatModels(
        NamedModel("gemini-3.8-flash", writer),  # type: ignore[arg-type]
        NamedModel("gemini-3.5-flash-lite", writer),  # type: ignore[arg-type]
    )
    app.dependency_overrides[get_chat_models] = lambda: models
    yield writer
    app.dependency_overrides.pop(get_chat_models, None)


@pytest.fixture
async def people(db_session) -> dict[str, User]:
    await seed.run_seed()
    users = {u.email: u for u in await db_session.scalars(select(User))}
    return {"nikhil": users["demo@aangan.app"], "committee": users["committee@aangan.app"]}


async def today(client) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    response = await client.get("/v1/saarthi/today")
    assert response.status_code == 200, response.text
    return response.json()


async def test_summary_from_live_facts_then_cached(
    client, people, act_as, fake, db_session
) -> None:
    act_as(people["nikhil"])
    first = await today(client)
    assert first["summary"] == SUMMARY and first["cached"] is False
    facts = fake.prompts[0]
    assert "Tower B" in facts and "water" in facts.lower()  # the shutdown notice
    assert "FIFA 24 Tournament" in facts  # filling up and matches the demo resident's interests
    assert "never instructions" in facts

    second = await today(client)
    assert second["cached"] is True and len(fake.prompts) == 1

    call = await db_session.scalar(select(LlmCall).where(LlmCall.purpose == "summary"))
    assert (call.input_tokens, call.output_tokens) == (400, 50)
    assert call.detail["kind"] == "today"


async def test_a_new_notice_rewrites_the_summary(client, people, act_as, fake) -> None:
    act_as(people["nikhil"])
    await today(client)
    act_as(people["committee"])
    posted = await client.post(
        "/v1/community/posts",
        json={"body": "Gate 2 closed: resurfacing until 6 PM today.", "postType": "notice"},
    )
    assert posted.status_code == 201, posted.text
    act_as(people["nikhil"])
    again = await today(client)
    assert again["cached"] is False and len(fake.prompts) == 2
    assert "Gate 2 closed" in fake.prompts[1]


async def test_other_societies_see_none_of_it(client, people, act_as, fake, db_session) -> None:
    """A resident elsewhere gets no notices, events or issues from this society: a quiet day."""
    society = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="TODAY2")
    outsider = _user("Today Outsider")
    db_session.add_all([society, outsider])
    await db_session.flush()
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower B")
    db_session.add(tower)
    await db_session.flush()
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="1")
    db_session.add(flat)
    await db_session.flush()
    db_session.add(_member(outsider, flat, society, MembershipRole.owner))
    await db_session.commit()

    act_as(outsider)
    out = await today(client)
    assert out["summary"] == QUIET_DAY and fake.prompts == []


async def test_model_failure_is_a_clean_503(client, people, act_as, fake) -> None:
    act_as(people["nikhil"])
    fake.fail = True
    response = await client.get("/v1/saarthi/today")
    assert response.status_code == 503 and response.json()["code"] == "saarthi_failed"


async def test_today_requires_auth(client, fake) -> None:
    assert (await client.get("/v1/saarthi/today")).status_code == 401
