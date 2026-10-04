"""Fill with Saarthi: cleaned values, edit mode, live hints, limits and scoping."""

import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from langchain_core.messages import AIMessage
from sqlalchemy import select

from app.agents.llm import ChatModels, NamedModel, get_chat_models
from app.auth import get_current_user
from app.core.config import get_settings
from app.main import app
from app.models import LlmCall, User

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed

IST = ZoneInfo("Asia/Kolkata")


class FakeStructured:
    """Stands in for a chat model: returns the queued dict as the requested schema."""

    def __init__(self) -> None:
        self.outputs: list[dict[str, Any]] = []
        self.prompts: list[str] = []
        self.fail = False

    def with_structured_output(self, schema: Any, include_raw: bool = False) -> "FakeStructured":
        self.schema = schema
        return self

    async def ainvoke(self, messages: list[Any]) -> Any:
        self.prompts.append("\n".join(str(m.content) for m in messages))
        if self.fail:
            raise RuntimeError("provider down")
        raw = AIMessage(
            "", usage_metadata={"input_tokens": 900, "output_tokens": 60, "total_tokens": 960}
        )
        return {"parsed": self.schema.model_validate(self.outputs.pop(0)), "raw": raw}


@pytest.fixture
def fake() -> Any:
    model = FakeStructured()
    models = ChatModels(
        NamedModel("gemini-3.8-flash", model), NamedModel("gemini-3.5-flash-lite", model)
    )  # type: ignore[arg-type]
    app.dependency_overrides[get_chat_models] = lambda: models
    yield model
    app.dependency_overrides.pop(get_chat_models, None)


@pytest.fixture
async def people(db_session) -> dict[str, User]:
    await seed.run_seed()
    users = {u.email: u for u in await db_session.scalars(select(User))}
    return {"nikhil": users["demo@aangan.app"], "ananya": users["ananya.iyer@example.com"]}


def day(n: int) -> str:
    return (datetime.now(IST) + timedelta(days=n)).date().isoformat()


async def fill(client, form: str, text: str, current: dict | None = None) -> dict:  # type: ignore[no-untyped-def]
    body: dict[str, Any] = {"form": form, "text": text}
    if current is not None:
        body["current"] = current
    response = await client.post("/v1/saarthi/fill", json=body)
    assert response.status_code == 200, response.text
    return response.json()


async def test_event_fill_acceptance_example(client, people, act_as, fake, db_session) -> None:
    act_as(people["nikhil"])
    fake.outputs = [
        {
            "title": "Sunday morning cycling ride",
            "locationLabel": "Gate 1",
            "startsAt": f"{day(6)}T06:30",
            "capacity": 15,
            "category": "sports",
        }
    ]
    out = await fill(
        client, "event", "Sunday morning cycling ride from Gate 1 at 6:30 for 15 people"
    )
    assert out["values"] == {
        "title": "Sunday morning cycling ride",
        "locationLabel": "Gate 1",
        "startsAt": f"{day(6)}T06:30",
        "capacity": 15,
        "category": "sports",
    }
    assert set(out["filled"]) == set(out["values"]) and out["question"] is None
    assert "Today is" in fake.prompts[0] and "information only" in fake.prompts[0]
    call = await db_session.scalar(select(LlmCall).where(LlmCall.purpose == "fill"))
    assert call.detail == {"form": "event", "edit": False}
    assert (call.input_tokens, call.output_tokens) == (900, 60) and call.cost_usd > 0


async def test_past_times_move_to_next_week_and_bad_values_are_dropped(
    client, people, act_as, fake
) -> None:
    act_as(people["nikhil"])
    yesterday = (datetime.now(IST) - timedelta(days=1)).date()
    fake.outputs = [
        {
            "title": "  ",
            "startsAt": f"{yesterday.isoformat()}T07:00",
            "endsAt": "tomorrow-ish",
            "capacity": 99999,
            "category": "sports",
        }
    ]
    out = await fill(client, "event", "Yoga at 7")
    assert out["values"]["startsAt"] == f"{(yesterday + timedelta(days=7)).isoformat()}T07:00"
    assert out["values"]["capacity"] == 2000
    assert "title" not in out["values"] and "endsAt" not in out["values"]


async def test_hall_events_end_by_1030_and_clashes_are_flagged(client, people, act_as, fake):
    act_as(people["nikhil"])
    events = (await client.get("/v1/events")).json()
    salsa = next(e for e in events if e["location"] == "Community Hall")
    starts = datetime.fromisoformat(salsa["startsAt"]).astimezone(IST)
    fake.outputs = [
        {
            "title": "Movie night",
            "locationLabel": "Community Hall",
            "startsAt": starts.strftime("%Y-%m-%dT%H:%M"),
            "endsAt": starts.strftime("%Y-%m-%dT23:30"),
        }
    ]
    out = await fill(client, "event", "Movie night in the hall till 11:30")
    assert out["values"]["endsAt"].endswith("T22:30")
    kinds = {h["kind"] for h in out["hints"]}
    assert kinds == {"rule", "clash"}
    clash = next(h for h in out["hints"] if h["kind"] == "clash")
    assert salsa["title"] in clash["text"]


async def test_edit_by_instruction_returns_only_changes(client, people, act_as, fake) -> None:
    act_as(people["nikhil"])
    current = {
        "title": "Movie night",
        "startsAt": f"{day(3)}T19:00",
        "endsAt": f"{day(3)}T21:00",
        "capacity": 40,
    }
    fake.outputs = [
        {
            "title": "Movie night",
            "startsAt": f"{day(3)}T20:00",
            "endsAt": f"{day(3)}T22:00",
            "capacity": 40,
        }
    ]
    out = await fill(client, "event", "move it to 8 PM", current=current)
    assert out["values"] == {"startsAt": f"{day(3)}T20:00", "endsAt": f"{day(3)}T22:00"}
    assert "EDIT MODE" in fake.prompts[0] and "Movie night" in fake.prompts[0]


async def test_issue_fill_suggests_me_too(client, people, act_as, fake) -> None:
    act_as(people["nikhil"])
    fake.outputs = [
        {
            "category": "lift",
            "scope": "common_area",
            "tower": "B",
            "areaLabel": "Lift 2",
            "title": "Lift 2 stuck at 5th floor",
            "urgency": "urgent",
        }
    ]
    out = await fill(client, "issue", "Lift 2 in Tower B stuck at 5th floor")
    assert out["values"]["tower"] == "Tower B"
    [hint] = out["hints"]
    assert hint["kind"] == "me_too" and hint["text"].startswith("HD-1042")
    assert hint["href"] == f"/help-desk/tickets/{hint['issueId']}"


async def test_listing_fill_price_range(client, people, act_as, fake) -> None:
    act_as(people["nikhil"])
    listings = (await client.get("/v1/marketplace/listings")).json()
    category = next(
        c
        for c in {x["category"] for x in listings}
        if sum(1 for x in listings if x["category"] == c and not x["isFree"]) >= 2
    )
    fake.outputs = [{"title": "Something", "category": category, "condition": "good", "price": 0}]
    out = await fill(client, "listing", "giving away something")
    assert out["values"]["isFree"] is True and out["values"]["price"] == ""
    assert out["hints"][0]["kind"] == "price"
    assert out["hints"][0]["text"].startswith("Similar items in the society are listed for ₹")


@pytest.mark.parametrize(
    ("form", "output", "expected"),
    [
        (
            "business",
            {
                "name": "Meera's Bakes",
                "category": "food",
                "days": ["sat", "sat", "sun"],
                "offerings": [
                    {"name": "Banana bread", "price": 350},
                    {"name": "Free sample", "price": 0},
                ],
            },
            {
                "name": "Meera's Bakes",
                "category": "food",
                "days": ["sat", "sun"],
                "offerings": [{"name": "Banana bread", "price": "350", "unit": "each", "note": ""}],
            },
        ),
        (
            "opening",
            {
                "kind": "room_available",
                "bhk": 3,
                "rent": 18000,
                "furnishing": "furnished",
                "availableFrom": "1999-01-01",
            },
            {"kind": "room_available", "bhk": 3, "rent": "18000", "furnishing": "furnished"},
        ),
        (
            "group",
            {"name": "Sunday Chess", "visibility": "public", "tags": ["chess", " "]},
            {"name": "Sunday Chess", "visibility": "public", "tags": ["chess"]},
        ),
        (
            "post",
            {"body": "Anyone for chess?", "postType": "question", "group": "Not my group"},
            {"body": "Anyone for chess?", "postType": "question"},
        ),
        (
            "feedback",
            {"topic": "suggestion", "message": "More benches please", "anonymous": True},
            {"topic": "suggestion", "message": "More benches please", "anonymous": True},
        ),
    ],
)
async def test_other_forms_are_cleaned(client, people, act_as, fake, form, output, expected):
    act_as(people["nikhil"])
    fake.outputs = [output]
    out = await fill(client, form, "fill it please")
    assert out["values"] == expected


async def test_question_passes_through(client, people, act_as, fake) -> None:
    act_as(people["nikhil"])
    fake.outputs = [{"title": "Cycling ride", "question": "Which day should the ride be?"}]
    out = await fill(client, "event", "cycling ride")
    assert out["question"] == "Which day should the ride be?"


@pytest.mark.parametrize(
    "body",
    [
        {"form": "spaceship", "text": "hi there"},
        {"form": "event", "text": ""},
        {"form": "event", "text": "x" * 501},
        {"form": "event"},
    ],
)
async def test_fill_validation(client, people, act_as, fake, body) -> None:
    act_as(people["nikhil"])
    assert (await client.post("/v1/saarthi/fill", json=body)).status_code == 422


async def test_fill_requires_auth(client, fake) -> None:
    response = await client.post("/v1/saarthi/fill", json={"form": "event", "text": "hi there"})
    assert response.status_code == 401


async def test_fill_failure_and_rate_limit(client, people, act_as, fake, monkeypatch) -> None:
    act_as(people["nikhil"])
    fake.fail = True
    response = await client.post("/v1/saarthi/fill", json={"form": "event", "text": "hi there"})
    assert response.status_code == 503 and response.json()["code"] == "saarthi_failed"
    fake.fail = False
    monkeypatch.setattr(get_settings(), "SAARTHI_CHAT_PER_10MIN", 1)
    response = await client.post("/v1/saarthi/fill", json={"form": "event", "text": "hi there"})
    assert response.status_code == 429


async def test_hints_stay_in_the_society(client, people, act_as, fake, db_session) -> None:
    """Another society's resident gets no hints from this society's issues or listings."""
    import uuid

    from app.models import Flat, MembershipRole, Society, Tower
    from tests.test_help_desk_api import _member, _user

    society = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="FILL02")
    outsider = _user("Fill Outsider")
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
    fake.outputs = [{"category": "lift", "scope": "common_area", "tower": "B"}]
    out = await fill(client, "issue", "Lift stuck in Tower B")
    assert out["hints"] == []
    app.dependency_overrides.pop(get_current_user, None)


async def test_edit_hints_use_current_values_and_skip_the_item_itself(
    client, people, act_as, fake
) -> None:
    act_as(people["nikhil"])
    events = (await client.get("/v1/events")).json()
    hall = next(e for e in events if e["location"] == "Community Hall")
    starts = datetime.fromisoformat(hall["startsAt"]).astimezone(IST)
    current = {
        "title": hall["title"],
        "locationLabel": "Community Hall",
        "startsAt": starts.strftime("%Y-%m-%dT%H:%M"),
        "endsAt": (starts + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M"),
    }
    fake.outputs = [{"endsAt": starts.strftime("%Y-%m-%dT23:30")}]
    response = await client.post(
        "/v1/saarthi/fill",
        json={
            "form": "event",
            "text": "run it till 11:30",
            "current": current,
            "itemId": hall["id"],
        },
    )
    assert response.status_code == 200, response.text
    out = response.json()
    assert out["values"] == {"endsAt": starts.strftime("%Y-%m-%dT22:30")}
    assert [h["kind"] for h in out["hints"]] == ["rule"]


async def test_event_fill_knows_the_residents_flat_and_fills_alongside_a_question(
    client, people, act_as, fake
) -> None:
    act_as(people["nikhil"])
    fake.outputs = [
        {
            "title": "FIFA Night",
            "locationLabel": "Tower C, Flat 702",
            "category": "sports",
            "question": "Which day?",
        }
    ]
    out = await fill(client, "event", "a fifa night at my flat")
    assert out["values"]["locationLabel"] == "Tower C, Flat 702"
    assert out["question"] == "Which day?"
    assert '"resident_flat_location": "Tower C, Flat 702"' in fake.prompts[0]
    assert "even when something is missing" in fake.prompts[0]
