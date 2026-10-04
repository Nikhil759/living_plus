"""Every write tool: prepare a proposal and execute it through the real service, on the seed."""

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from pydantic_core import to_jsonable_python
from sqlalchemy import select

from app.agents.tools.base import ToolContext
from app.agents.tools.committee import COMMITTEE_WRITES
from app.agents.tools.write import RESIDENT_WRITES
from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import LocalBusiness, Membership, User
from app.services import amenities as amenity_service

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed

IST = ZoneInfo("Asia/Kolkata")
WRITES = {spec.name: spec for spec in [*RESIDENT_WRITES, *COMMITTEE_WRITES]}


async def _ctx(db_session, user: User) -> ToolContext:
    membership = await db_session.scalar(select(Membership).where(Membership.user_id == user.id))
    member = CurrentMember(
        user=user,
        society_id=membership.society_id,
        role=membership.role.value,
        flat_id=membership.flat_id,
        membership_id=membership.id,
    )
    return ToolContext(db=db_session, member=member, now=datetime.now(UTC))


async def run(ctx: ToolContext, tool: str, **args: Any) -> str:
    """Prepare then execute; returns the outcome message."""
    proposal = await WRITES[tool].propose(ctx, args)
    assert proposal.title and proposal.lines, tool
    # Payloads are stored as JSON between proposal and confirm; replay them the same way.
    outcome = await WRITES[tool].execute(ctx, to_jsonable_python(proposal.payload))
    assert outcome.message, tool
    return outcome.message


def day(n: int) -> str:
    return (datetime.now(IST) + timedelta(days=n)).date().isoformat()


@pytest.fixture
async def actors(db_session) -> dict[str, ToolContext]:
    await seed.run_seed()
    users = {u.email: u for u in await db_session.scalars(select(User))}
    owner_id = await db_session.scalar(
        select(LocalBusiness.owner_id).where(LocalBusiness.name.like("Amma%"))
    )
    owner = await db_session.get(User, owner_id)
    return {
        "nikhil": await _ctx(db_session, users["demo@aangan.app"]),
        "committee": await _ctx(db_session, users["committee@aangan.app"]),
        "owner": await _ctx(db_session, owner),
    }


async def test_amenity_and_event_tools(actors) -> None:
    me = actors["nikhil"]
    options = await amenity_service.list_amenities(me.db, me.member.society_id)
    court = next(a for a in options if a.name == "Badminton 2")
    slots = await amenity_service.get_slots(
        me.db, me.member, court.id, datetime.fromisoformat(day(3)).date()
    )
    free = next(s for s in slots.slots if s.state == "free").starts_at.astimezone(IST)

    assert (
        await run(me, "book_slot", amenity="Badminton 2", date=day(3), time=free.strftime("%H:%M"))
    ).startswith("Booked Badminton 2")
    assert (
        await run(
            me, "cancel_booking", amenity="Badminton 2", date=day(3), time=free.strftime("%H:%M")
        )
    ).startswith("Cancelled")

    assert (await run(me, "rsvp", event="Morning Expressway 25km Ride")).startswith("You're going")
    assert (await run(me, "cancel_rsvp", event="Morning Expressway 25km Ride")).startswith(
        "Cancelled your RSVP"
    )

    created = await run(
        me,
        "create_event",
        title="Sunday cycling ride",
        date=day(5),
        start_time="06:30",
        end_time="08:00",
        location="Gate 1",
        capacity=15,
        category="sports",
    )
    assert created == '"Sunday cycling ride" is published.'
    assert (
        await run(me, "edit_my_event", event="Sunday cycling ride", end_time="08:30")
    ).startswith("Updated")
    assert (
        await run(me, "cancel_my_event", event="Sunday cycling ride", reason="Rain expected")
    ).startswith("Cancelled")

    assert "with the committee" in await run(
        me, "apply_for_stall", event="Diwali Mela", stall_type="Chaat"
    )


async def test_waitlist_for_a_full_event(actors) -> None:
    owner, committee, me = actors["owner"], actors["committee"], actors["nikhil"]
    await run(
        owner,
        "create_event",
        title="Tiny tasting",
        date=day(4),
        start_time="18:00",
        end_time="19:00",
        location="Café Lounge",
        capacity=1,
        category="food",
    )
    assert (await run(committee, "rsvp", event="Tiny tasting")).startswith("You're going")
    assert (await run(me, "join_waitlist", event="Tiny tasting")).startswith(
        "You're on the waitlist"
    )


async def test_help_desk_tools(actors) -> None:
    me = actors["nikhil"]
    reported = await run(
        me,
        "report_issue",
        category="plumbing",
        where="my_flat",
        title="Kitchen tap leaking",
        description="Drips all night.",
    )
    assert reported.startswith("Reported as HD-")
    assert "12 residents" in await run(me, "me_too", issue="HD-1042")
    assert (await run(me, "comment_on_issue", issue="HD-1042", message="Still happening")) == (
        "Added your comment to HD-1042."
    )
    assert (await run(me, "confirm_fixed", issue="HD-0970", fixed=True)) == "HD-0970 is closed."
    assert (await run(me, "give_feedback", message="Please add more benches.")).startswith("Sent")


async def test_marketplace_business_and_opening_tools(actors) -> None:
    me, owner = actors["nikhil"], actors["owner"]
    assert (await run(me, "update_listing", listing="microwave", price_inr=2500)).startswith(
        "Updated"
    )
    assert "reserved" in await run(me, "mark_listing", listing="microwave", status="reserved")
    assert "available" in await run(me, "mark_listing", listing="microwave", status="available")
    assert await run(me, "delete_listing", listing="air fryer") == "Deleted the listing."
    draft = await WRITES["create_listing"].propose(me, {"title": "Kids cycle", "category": "kids"})
    assert draft.draft_only
    with pytest.raises(AppError):
        await WRITES["create_listing"].execute(me, draft.payload)

    assert (await run(me, "follow_business", business="Amma")).startswith("You're following")
    assert (await run(me, "unfollow_business", business="Amma")).startswith("You've unfollowed")
    assert (await run(me, "recommend_business", business="Amma", note="Great sambar")).startswith(
        "Recommended"
    )
    assert "followers will see it" in await run(
        owner, "post_business_update", text="Today: idli and coconut chutney"
    )
    assert "on break" in await run(owner, "set_business_status", status="on_break")
    assert (
        await WRITES["start_business_listing"].propose(
            me, {"name": "Nikhil's Bakes", "category": "food", "tagline": "Banana bread"}
        )
    ).draft_only

    assert (
        await run(
            me,
            "post_opening",
            kind="room_available",
            bhk=3,
            rent_inr=18000,
            furnishing="furnished",
            description="Sunny room for a working woman.",
            preference="women_only",
        )
    ).startswith("Posted")
    room = "Room in 3 BHK"  # the demo user also has a seeded full-flat opening
    assert (await run(me, "edit_opening", opening=room, rent_inr=19000)).startswith("Updated")
    assert (await run(me, "mark_opening_filled", opening=room)).startswith("Marked")
    assert await run(me, "delete_opening", opening=room) == "Deleted the opening."


async def test_community_and_profile_tools(actors) -> None:
    me = actors["nikhil"]
    assert (
        await run(me, "write_post", text="Anyone up for chess this weekend?", post_type="question")
        == "Posted."
    )
    assert (await run(me, "leave_group", group="Dog Parents")).startswith("You've left")
    assert (await run(me, "join_group", group="Dog Parents")).startswith("You've joined")
    assert (
        await run(me, "start_group", name="Sunday Chess", description="Casual games at the café")
    ).startswith("Started Sunday Chess")
    assert "invite" in await run(me, "request_whatsapp", group="Society Marketplace")
    assert await run(me, "update_interests", add=["chess"]) == "Saved your profile."
    assert await run(me, "set_privacy", show_flat_number="on") == "Saved your profile."


async def test_committee_tools(actors) -> None:
    me, committee = actors["nikhil"], actors["committee"]
    for title in ("Hall movie night", "Hall karaoke night"):
        sent = await run(
            me,
            "create_event",
            title=title,
            date=day(8),
            start_time="19:00",
            end_time="22:00",
            space="Community Hall",
            capacity=40,
            category="social",
        )
        assert "committee for approval" in sent
    assert (await run(committee, "approve_event", event="Hall movie night")).startswith("Approved")
    assert (
        await run(
            committee,
            "reject_event",
            event="Hall karaoke night",
            reason="Clashes with the AGM prep",
        )
    ).startswith("Rejected")
    assert (
        await run(committee, "review_business", business="Isha's Kids Dance Classes", approve=True)
    ).startswith("Approved")
    await run(me, "apply_for_stall", event="Diwali Mela", stall_type="handicraft")
    assert (
        await run(
            committee,
            "decide_stall",
            event="Diwali Mela",
            applicant="Handicraft",
            approve=True,
            spot="F1",
        )
    ).startswith("Approved the stall")
    assert (
        await run(
            committee,
            "post_notice",
            title="Notice: Lift servicing in Tower A",
            text="Lift 1 in Tower A is shut on Friday 10 AM to 1 PM.",
        )
    ).startswith("Posted the notice")
    assert (
        await run(
            committee, "set_amenity_status", amenity="Tennis Court", closed=True, note="Resurfacing"
        )
        == "Updated Tennis Court."
    )
    assert (
        await run(committee, "set_amenity_status", amenity="Tennis Court", closed=False)
        == "Updated Tennis Court."
    )


def test_every_write_tool_is_covered() -> None:
    covered = {
        "book_slot",
        "cancel_booking",
        "rsvp",
        "cancel_rsvp",
        "create_event",
        "edit_my_event",
        "cancel_my_event",
        "apply_for_stall",
        "report_issue",
        "me_too",
        "comment_on_issue",
        "confirm_fixed",
        "give_feedback",
        "update_listing",
        "mark_listing",
        "delete_listing",
        "create_listing",
        "follow_business",
        "unfollow_business",
        "recommend_business",
        "post_business_update",
        "set_business_status",
        "start_business_listing",
        "edit_opening",
        "mark_opening_filled",
        "delete_opening",
        "post_opening",
        "write_post",
        "leave_group",
        "join_group",
        "start_group",
        "request_whatsapp",
        "update_interests",
        "set_privacy",
        "approve_event",
        "reject_event",
        "review_business",
        "decide_stall",
        "post_notice",
        "set_amenity_status",
        "join_waitlist",
    }
    assert set(WRITES) == covered
