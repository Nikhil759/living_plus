"""Saarthi read tools against the real demo seed, plus a second society for scoping."""

import json
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import select

from app.agents.tools.base import ToolContext, ToolInputError
from app.agents.tools.read import READ_TOOLS
from app.auth.deps import CurrentMember
from app.models import (
    Event,
    Flat,
    MarketplaceListing,
    Membership,
    Society,
    Tower,
    User,
)
from app.models.enums import (
    EventCategory,
    EventStatus,
    EventType,
    ListingCategory,
    ListingCondition,
    ListingContactMethod,
    ListingStatus,
    MembershipRole,
    MembershipStatus,
)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed

TOOLS = {t.name: t for t in READ_TOOLS}


async def _member(db_session, email: str) -> CurrentMember:
    user = await db_session.scalar(select(User).where(User.email == email))
    membership = await db_session.scalar(select(Membership).where(Membership.user_id == user.id))
    return CurrentMember(
        user=user,
        society_id=membership.society_id,
        role=membership.role.value,
        flat_id=membership.flat_id,
        membership_id=membership.id,
    )


@pytest.fixture
async def ctx(db_session) -> ToolContext:
    await seed.run_seed()
    return ToolContext(
        db=db_session, member=await _member(db_session, "demo@aangan.app"), now=datetime.now(UTC)
    )


@pytest.fixture
async def outsider(db_session, ctx) -> ToolContext:
    """A resident of another society that has its own event and listing."""
    society = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="TOOLS2")
    user = User(id=uuid.uuid4(), supabase_uid="seed:out", email="out@example.com", name="Out Sider")
    db_session.add_all([society, user])
    await db_session.flush()
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower A")
    db_session.add(tower)
    await db_session.flush()
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="1")
    db_session.add(flat)
    await db_session.flush()
    membership = Membership(
        id=uuid.uuid4(),
        user_id=user.id,
        society_id=society.id,
        flat_id=flat.id,
        role=MembershipRole.owner,
        status=MembershipStatus.approved,
    )
    starts = datetime.now(UTC) + timedelta(days=1)
    db_session.add_all(
        [
            membership,
            Event(
                id=uuid.uuid4(),
                society_id=society.id,
                public_slug="evt-elsewhere",
                title="Elsewhere secret party",
                host_id=user.id,
                event_type=EventType.free,
                category=EventCategory.social,
                starts_at=starts,
                ends_at=starts + timedelta(hours=2),
                capacity=10,
                price_paise=0,
                status=EventStatus.published,
                location_label="Pune",
            ),
            MarketplaceListing(
                id=uuid.uuid4(),
                society_id=society.id,
                seller_id=user.id,
                title="Elsewhere cycle",
                price_inr=100,
                category=ListingCategory.sports,
                condition=ListingCondition.good,
                contact_method=ListingContactMethod.whatsapp,
                status=ListingStatus.available,
                listed_at=datetime.now(UTC),
            ),
        ]
    )
    await db_session.commit()
    return ToolContext(
        db=db_session,
        member=CurrentMember(
            user=user,
            society_id=society.id,
            role="owner",
            flat_id=flat.id,
            membership_id=membership.id,
        ),
        now=datetime.now(UTC),
    )


def dump(result) -> str:  # type: ignore[no-untyped-def]
    return json.dumps(result.data, default=str) + json.dumps(
        [c.model_dump() for c in result.cards], default=str
    )


async def test_find_events_stays_in_the_society(ctx, outsider) -> None:
    start = ctx.today.isoformat()
    end = (ctx.today + timedelta(days=14)).isoformat()
    result = await TOOLS["find_events"](ctx, {"date_from": start, "date_to": end})
    titles = [e["title"] for e in result.data["events"]]
    assert titles and "Elsewhere secret party" not in titles
    assert all(card.href and card.href.startswith("/events/") for card in result.cards)

    theirs = await TOOLS["find_events"](outsider, {"date_from": start, "date_to": end})
    assert [e["title"] for e in theirs.data["events"]] == ["Elsewhere secret party"]


async def test_event_details_hide_attendees(ctx) -> None:
    found = await TOOLS["find_events"](
        ctx, {"date_to": (ctx.today + timedelta(days=14)).isoformat()}
    )
    first = found.data["events"][0]
    detail = await TOOLS["event_details"](ctx, {"event": first["title"].lower()})
    assert detail.data["title"] == first["title"]
    # No attendee list (names) ever reaches the model.
    assert "attendees" not in detail.data and "going_people" not in detail.data


async def test_free_slots_filter_by_time_and_explain_bad_input(ctx) -> None:
    tomorrow = (ctx.today + timedelta(days=1)).isoformat()
    everything = await TOOLS["free_slots"](ctx, {"amenity": "badminton 2", "date": tomorrow})
    evening = await TOOLS["free_slots"](
        ctx, {"amenity": "Badminton 2", "date": tomorrow, "from_time": "18:00"}
    )
    assert everything.data["amenity"] == "Badminton 2"
    assert len(evening.data["free_slots"]) <= len(everything.data["free_slots"])
    assert all(not s.startswith(("6 AM", "7 AM")) for s in evening.data["free_slots"])
    assert evening.cards[0].kind == "slots"

    with pytest.raises(ToolInputError, match="No amenity called 'squash'"):
        await TOOLS["free_slots"](ctx, {"amenity": "squash"})
    with pytest.raises(ToolInputError, match="not a date"):
        await TOOLS["free_slots"](ctx, {"amenity": "Badminton 1", "date": "next blursday"})
    with pytest.raises(ToolInputError, match="not booked by slot"):
        await TOOLS["free_slots"](ctx, {"amenity": "Gym"})


async def test_space_schedule_lists_events_in_the_hall(ctx) -> None:
    events = (
        await TOOLS["find_events"](ctx, {"date_to": (ctx.today + timedelta(days=14)).isoformat()})
    ).data["events"]
    in_hall = next(e for e in events if e["where"] == "Community Hall")
    day = in_hall["date"]
    result = await TOOLS["space_schedule"](ctx, {"space": "the hall", "date": day})
    assert result.data["space"] == "Community Hall" and result.data["capacity"] == 120
    assert in_hall["title"] in [b["event"] for b in result.data["booked"]]


async def test_help_desk_tools(ctx, outsider) -> None:
    mine = await TOOLS["my_issues"](ctx, {})
    assert {i["number"] for i in mine.data} >= {"HD-1088", "HD-0970"}
    tower_b = await TOOLS["open_issues_in_tower"](ctx, {"tower": "B"})
    assert [i["number"] for i in tower_b.data] == ["HD-1042"]
    assert tower_b.cards[0].detail == "11 reporters"
    assert (await TOOLS["my_issues"](outsider, {})).data == []

    vendors = await TOOLS["find_vendors"](ctx, {"category": "plumbing"})
    assert [v["vendor"] for v in vendors.data] == ["AquaCare Plumbing"]


async def test_marketplace_and_businesses_are_scoped_and_private(ctx, outsider) -> None:
    cycles = await TOOLS["search_listings"](ctx, {"text": "cycle"})
    assert cycles.data and all(row["title"] != "Elsewhere cycle" for row in cycles.data)
    assert [r["title"] for r in (await TOOLS["search_listings"](outsider, {})).data] == [
        "Elsewhere cycle"
    ]

    tiffin = await TOOLS["business_details"](ctx, {"business": "tiffin"})
    assert tiffin.data["latest_update"] is not None
    text = dump(tiffin)
    assert "+91" not in text and "phone" not in text and "whatsapp" not in text


async def test_neighbours_with_interest_counts_hidden_profiles_but_never_names_them(ctx) -> None:
    result = await TOOLS["neighbours_with_interest"](ctx, {"interest": "Football"})
    assert result.data["residents_with_interest"] == 13  # 14 fans minus the asker
    visible = result.data["visible_profiles"]
    assert 0 < len(visible) < 13
    assert all(set(person) == {"first_name", "tower"} for person in visible)


async def test_my_profile_and_groups(ctx) -> None:
    me = await TOOLS["my_profile"](ctx, {})
    assert "football" in me.data["interests"] and me.data["tower"] == "Tower C"
    groups = await TOOLS["my_groups"](ctx, {})
    assert any(g["joined"] for g in groups.data)


async def test_schemas_are_gemini_safe() -> None:
    for tool in READ_TOOLS:
        schema = tool.schema()["function"]
        for prop in schema["parameters"].get("properties", {}).values():
            assert "" not in prop.get("enum", ["x"]), tool.name
        assert schema["description"] and tool.status.endswith("…")
