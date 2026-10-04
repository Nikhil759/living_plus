"""Saarthi actions end to end on the demo seed: proposal → confirm/cancel → real service."""

import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.agents.llm import ChatModels, NamedModel, get_chat_models
from app.core.config import get_settings
from app.main import app
from app.models import Event, Notification, SaarthiAction, Ticket, TicketFollower, User
from app.models.enums import ActionStatus, EventStatus
from tests.test_saarthi_api import FakeGemini, parse_sse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed

IST = ZoneInfo("Asia/Kolkata")


@pytest.fixture
async def people(db_session) -> dict[str, User]:
    await seed.run_seed()
    emails = {
        "nikhil": "demo@aangan.app",
        "committee": "committee@aangan.app",
        "ananya": "ananya.iyer@example.com",
    }
    return {
        key: await db_session.scalar(select(User).where(User.email == email))
        for key, email in emails.items()
    }


@pytest.fixture
def model() -> Any:
    fake = FakeGemini()
    models = ChatModels(
        NamedModel("gemini-3.8-flash", fake), NamedModel("gemini-3.5-flash-lite", fake)
    )
    app.dependency_overrides[get_chat_models] = lambda: models
    yield fake
    app.dependency_overrides.pop(get_chat_models, None)


def ist_day(days_ahead: int) -> str:
    return (datetime.now(IST) + timedelta(days=days_ahead)).date().isoformat()


async def ask(client: AsyncClient, message: str) -> list[tuple[str, dict]]:
    response = await client.post("/v1/saarthi/chat", json={"message": message})
    assert response.status_code == 200, response.text
    return parse_sse(response.text)


async def free_slot(client: AsyncClient, amenity: str, day: str) -> str:
    amenities = (await client.get("/v1/amenities")).json()
    amenity_id = next(a["id"] for a in amenities if a["name"] == amenity)
    slots = (await client.get(f"/v1/amenities/{amenity_id}/slots", params={"day": day})).json()
    start = next(s["startsAt"] for s in slots["slots"] if s["state"] == "free")
    return datetime.fromisoformat(start).astimezone(IST).strftime("%H:%M")


async def propose_booking(client, model) -> tuple[dict, str]:  # type: ignore[no-untyped-def]
    day = ist_day(2)
    time = await free_slot(client, "Badminton 2", day)
    model.script = [
        {"tool": "book_slot", "args": {"amenity": "Badminton 2", "date": day, "time": time}},
        "Here's the booking, confirm below.",
    ]
    events = await ask(client, "Book badminton 2 the day after tomorrow")
    return events[-1][1], time


# --- framework -------------------------------------------------------------------------------


async def test_booking_happens_only_on_confirm(client, people, act_as, model, db_session) -> None:
    act_as(people["nikhil"])
    before = len((await client.get("/v1/amenities/bookings/mine")).json())
    done, _ = await propose_booking(client, model)

    card = done["action"]
    assert card["status"] == "proposed" and card["title"] == "Book Badminton 2"
    assert card["confirmLabel"] == "Book" and card["draftOnly"] is False
    assert [line["label"] for line in card["lines"]] == ["Court", "When"]
    assert len((await client.get("/v1/amenities/bookings/mine")).json()) == before
    tool_note = next(m for m in model.seen[1] if m.type == "tool").content
    assert tool_note.startswith("Proposed, NOT done yet.")

    response = await client.post(f"/v1/saarthi/actions/{card['id']}/confirm")
    assert response.status_code == 200
    body = response.json()
    assert body["action"]["status"] == "executed"
    assert body["message"]["content"].startswith("Booked Badminton 2 for")
    assert len((await client.get("/v1/amenities/bookings/mine")).json()) == before + 1

    again = await client.post(f"/v1/saarthi/actions/{card['id']}/confirm")
    assert again.status_code == 409 and again.json()["code"] == "already_decided"

    session = (await client.get("/v1/saarthi/sessions")).json()[0]
    history = (await client.get(f"/v1/saarthi/sessions/{session['id']}")).json()["messages"]
    assert history[1]["action"]["status"] == "executed"
    assert history[-1]["content"].startswith("Booked Badminton 2")

    audit = await db_session.get(SaarthiAction, uuid.UUID(card["id"]))
    await db_session.refresh(audit)
    assert audit.user_id == people["nikhil"].id and audit.tool == "book_slot"
    assert audit.decided_at is not None and audit.result["href"].startswith("/amenities/")


async def test_cancel_changes_nothing(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    before = len((await client.get("/v1/amenities/bookings/mine")).json())
    done, _ = await propose_booking(client, model)
    response = await client.post(f"/v1/saarthi/actions/{done['action']['id']}/cancel")
    assert response.json()["action"]["status"] == "cancelled"
    assert response.json()["message"]["content"] == "Okay, I won't do that."
    assert len((await client.get("/v1/amenities/bookings/mine")).json()) == before
    confirm = await client.post(f"/v1/saarthi/actions/{done['action']['id']}/confirm")
    assert confirm.status_code == 409


async def test_actions_belong_to_one_resident(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    done, _ = await propose_booking(client, model)
    action_id = done["action"]["id"]

    act_as(people["ananya"])
    for call in (
        client.get(f"/v1/saarthi/actions/{action_id}"),
        client.post(f"/v1/saarthi/actions/{action_id}/confirm"),
        client.post(f"/v1/saarthi/actions/{action_id}/cancel"),
    ):
        assert (await call).status_code == 404
    app.dependency_overrides.pop(
        __import__("app.auth", fromlist=["get_current_user"]).get_current_user
    )
    assert (await client.post(f"/v1/saarthi/actions/{action_id}/confirm")).status_code == 401
    assert (await client.get("/v1/saarthi/actions/not-an-id")).status_code == 401


async def test_expired_cards_cannot_be_confirmed(client, people, act_as, model, db_session) -> None:
    act_as(people["nikhil"])
    done, _ = await propose_booking(client, model)
    action = await db_session.get(SaarthiAction, uuid.UUID(done["action"]["id"]))
    action.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    response = await client.post(f"/v1/saarthi/actions/{action.id}/confirm")
    assert response.status_code == 410 and response.json()["code"] == "expired"
    assert (await client.get(f"/v1/saarthi/actions/{action.id}")).json()["card"]["status"] == (
        "expired"
    )


async def test_only_one_change_per_confirmation(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    day = ist_day(2)
    time = await free_slot(client, "Badminton 2", day)
    model.script = [
        {
            "calls": [
                {
                    "tool": "book_slot",
                    "args": {"amenity": "Badminton 2", "date": day, "time": time},
                },
                {"tool": "give_feedback", "args": {"message": "Please add more courts."}},
            ]
        },
        "First the booking; then I can send your feedback.",
    ]
    events = await ask(client, "Book a court and tell the committee we need more courts")
    tool_notes = [m.content for m in model.seen[1] if m.type == "tool"]
    assert tool_notes[0].startswith("Proposed, NOT done yet.")
    assert tool_notes[1].startswith("Tool error: only one change per confirmation")
    assert events[-1][1]["action"]["tool"] == "book_slot"
    assert model.bound_tools and len(model.bound_tools) == 1  # the lead-in round has no tools


async def test_service_errors_become_a_failed_result(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    first, _ = await propose_booking(client, model)
    await client.post(f"/v1/saarthi/actions/{first['action']['id']}/confirm")

    mine = (await client.get("/v1/amenities/bookings/mine")).json()
    booked = next(b for b in mine if b["id"] and b["amenityName"] == "Badminton 2")
    starts = datetime.fromisoformat(booked["startsAt"]).astimezone(IST)
    model.script = [
        {
            "tool": "cancel_booking",
            "args": {
                "amenity": "Badminton 2",
                "date": starts.date().isoformat(),
                "time": starts.strftime("%H:%M"),
            },
        },
        "Cancel below.",
    ]
    done = (await ask(client, "Cancel that booking"))[-1][1]
    await client.delete(f"/v1/amenities/bookings/{booked['id']}")  # cancelled elsewhere first

    response = await client.post(f"/v1/saarthi/actions/{done['action']['id']}/confirm")
    assert response.status_code == 200
    assert response.json()["action"]["status"] == "failed"
    assert response.json()["message"]["content"].startswith("I couldn't do that:")


async def test_draft_only_cards_open_the_form(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    model.script = [
        {
            "tool": "create_listing",
            "args": {"title": "Kids cycle", "category": "kids", "price_inr": 1500},
        },
        "Open the Sell form to add a photo.",
    ]
    card = (await ask(client, "Sell my kids cycle for 1500"))[-1][1]["action"]
    assert card["draftOnly"] is True
    assert card["editHref"] == f"/marketplace/new?saarthiAction={card['id']}"
    response = await client.post(f"/v1/saarthi/actions/{card['id']}/confirm")
    assert response.status_code == 422 and response.json()["code"] == "needs_form"
    stored = (await client.get(f"/v1/saarthi/actions/{card['id']}")).json()
    assert stored["payload"]["draft"]["title"] == "Kids cycle"


async def test_confirmations_are_rate_limited(client, people, act_as, model, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "SAARTHI_ACTIONS_PER_HOUR", 1)
    act_as(people["nikhil"])
    first, _ = await propose_booking(client, model)
    second, _ = await propose_booking(client, model)
    assert (
        await client.post(f"/v1/saarthi/actions/{first['action']['id']}/confirm")
    ).status_code == 200
    response = await client.post(f"/v1/saarthi/actions/{second['action']['id']}/confirm")
    assert response.status_code == 429


async def test_missing_details_come_back_as_a_question(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    model.script = [
        {
            "tool": "create_event",
            "args": {
                "title": "Cycling ride",
                "date": ist_day(3),
                "start_time": "06:30",
                "end_time": "08:00",
            },
        },
        "Where should the ride start?",
    ]
    events = await ask(client, "Create a cycling ride on Saturday at 6:30")
    assert events[-1][1]["action"] is None
    note = next(m.content for m in model.seen[1] if m.type == "tool")
    assert note == "Tool error: Where is the event? Ask for a place or a society space."


# --- flows -----------------------------------------------------------------------------------


async def test_report_issue_offers_me_too_then_joins(client, people, act_as, model, db_session):
    act_as(people["nikhil"])
    model.script = [
        {
            "tool": "report_issue",
            "args": {
                "category": "lift",
                "where": "common_area",
                "tower": "B",
                "title": "Lift stuck again",
                "description": "Tower B lift stuck on 5th floor",
            },
        },
        {"tool": "me_too", "args": {"issue": "HD-1042"}},
        "There's already an open issue; add yourself below.",
    ]
    events = await ask(client, "Lift in Tower B is stuck again")
    notes = [m.content for m in model.seen[-1] if m.type == "tool"]
    assert notes[0].startswith("Tool error: An open issue already covers this: HD-1042")
    card = events[-1][1]["action"]
    assert card["title"] == "Add you to HD-1042" and card["confirmLabel"] == "Me too"

    response = await client.post(f"/v1/saarthi/actions/{card['id']}/confirm")
    assert "12 residents have reported it now" in response.json()["message"]["content"]
    lift = await db_session.scalar(select(Ticket).where(Ticket.number == 1042))
    count = await db_session.scalar(
        select(func.count()).select_from(TicketFollower).where(TicketFollower.ticket_id == lift.id)
    )
    assert count == 12


async def test_watch_party_needs_approval_then_invites_football_fans(
    client, people, act_as, model, db_session
) -> None:
    saturday = ist_day(6)
    act_as(people["nikhil"])
    model.script = [
        {"tool": "space_schedule", "args": {"space": "Community Hall", "date": saturday}},
        {"tool": "neighbours_with_interest", "args": {"interest": "football"}},
        {
            "tool": "create_event",
            "args": {
                "title": "World Cup final watch party",
                "date": saturday,
                "start_time": "19:30",
                "end_time": "22:30",
                "space": "Community Hall",
                "capacity": 30,
                "category": "sports",
                "invite_interest": "football",
            },
        },
        "Here's the plan. Hall events need committee approval.",
    ]
    events = await ask(client, "The final is on Saturday. Plan a watch party for about 30 people.")
    card = events[-1][1]["action"]
    lines = {line["label"]: line["value"] for line in card["lines"]}
    assert lines["Where"] == "Community Hall" and lines["Capacity"] == "30"
    assert lines["Invite"] == "13 residents interested in football"
    assert card["approval"] == "the Managing Committee"
    assert card["editHref"] == f"/events/new?saarthiAction={card['id']}"

    confirmed = (await client.post(f"/v1/saarthi/actions/{card['id']}/confirm")).json()
    assert confirmed["action"]["status"] == "pending_approval"
    assert "committee for approval" in confirmed["message"]["content"]
    event = await db_session.scalar(
        select(Event).where(Event.title == "World Cup final watch party")
    )
    assert event.status == EventStatus.pending_approval and event.invite_interest == "football"
    invites = (
        select(func.count()).select_from(Notification).where(Notification.kind == "event_invite")
    )
    assert await db_session.scalar(invites) == 0  # nothing goes out before approval

    act_as(people["committee"])
    model.script = [
        {"tool": "approve_event", "args": {"event": "World Cup final watch party"}},
        "Approve below.",
    ]
    approval = (await ask(client, "Approve the watch party"))[-1][1]["action"]
    assert approval["title"] == "Approve World Cup final watch party"
    done = (await client.post(f"/v1/saarthi/actions/{approval['id']}/confirm")).json()
    assert done["action"]["status"] == "executed"

    await db_session.refresh(event)
    assert event.status == EventStatus.published
    assert await db_session.scalar(invites) == 13
    host_note = await db_session.scalar(
        select(Notification.title).where(
            Notification.user_id == people["nikhil"].id, Notification.kind == "event_review"
        )
    )
    assert host_note == "World Cup final watch party: approved"


async def test_residents_dont_get_committee_tools(client, people, act_as, model) -> None:
    act_as(people["nikhil"])
    model.script = [{"tool": "approve_event", "args": {"event": "anything"}}, "I can't do that."]
    await ask(client, "Approve my event")
    assert "approve_event" not in model.bound_tools[0]
    note = next(m.content for m in model.seen[1] if m.type == "tool")
    assert note == "Tool error: there is no tool called approve_event."


async def test_never_acts_for_someone_else(client, people, act_as, model, db_session) -> None:
    """Tools take no 'for whom' argument: whatever is confirmed belongs to the asker."""
    act_as(people["nikhil"])
    done, _ = await propose_booking(client, model)
    await client.post(f"/v1/saarthi/actions/{done['action']['id']}/confirm")
    act_as(people["ananya"])
    theirs = (await client.get("/v1/amenities/bookings/mine")).json()
    assert done["action"]["id"] not in {b["id"] for b in theirs}
    audit = await db_session.get(SaarthiAction, uuid.UUID(done["action"]["id"]))
    assert audit.user_id == people["nikhil"].id
    assert ActionStatus(audit.status) == ActionStatus.executed
