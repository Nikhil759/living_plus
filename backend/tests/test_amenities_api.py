import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.models import (
    Amenity,
    AmenityBooking,
    AmenityBookingStatus,
    AmenityStatus,
    AmenityType,
    CrowdLevel,
    Flat,
    Membership,
    MembershipRole,
    MembershipStatus,
    Society,
    Tower,
    User,
)
from tests.test_me_api import _enable_local_dev_auth

IST = timezone(timedelta(hours=5, minutes=30))
EN = "\u2013"
# A fixed Tuesday, 10:30 AM IST, so slot states never depend on the real clock.
NOW = datetime(2030, 1, 1, 10, 30, tzinfo=IST).astimezone(UTC)
TODAY = NOW.astimezone(IST).date()

GYM_WEEKDAY = [0] * 24
GYM_WEEKDAY[10] = 2


@dataclass
class World:
    society: Society
    member: User
    other: User
    court: Amenity
    gym: Amenity
    hall: Amenity


def _slot_start(day, hour: int) -> datetime:
    return datetime.combine(day, time(hour), tzinfo=IST).astimezone(UTC)


def _add_user(db_session, society: Society, flat: Flat, email: str, name: str) -> User:
    user = User(id=uuid.uuid4(), supabase_uid=f"seed:{email}", email=email, name=name)
    db_session.add(user)
    db_session.add(
        Membership(
            id=uuid.uuid4(),
            user_id=user.id,
            society_id=society.id,
            flat_id=flat.id,
            role=MembershipRole.owner,
            status=MembershipStatus.approved,
        )
    )
    return user


@pytest.fixture
async def world(db_session, monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[World]:
    monkeypatch.setattr("app.services.amenities.current_time", lambda: NOW)
    society = Society(id=uuid.uuid4(), name="Test Society", city="Gurgaon", invite_code="AMEN01")
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="702")
    db_session.add_all([society, tower, flat])
    await db_session.flush()
    member = _add_user(db_session, society, flat, "demo@aangan.app", "Nikhil")
    other = _add_user(db_session, society, flat, "other@aangan.app", "Rohan")

    def amenity(name: str, kind: AmenityType, rules: dict) -> Amenity:
        row = Amenity(
            id=uuid.uuid4(),
            society_id=society.id,
            name=name,
            amenity_type=kind,
            capacity=30,
            open_hours={},
            rules=rules,
        )
        db_session.add(row)
        return row

    court = amenity(
        "Badminton 1",
        AmenityType.court,
        {
            "advance_days": 7,
            "max_hours_per_day": 2,
            "blocks": [{"label": "Kids coaching", "days": [1], "start": "17:00", "end": "18:00"}],
        },
    )
    gym = amenity("Gym", AmenityType.gym, {"crowd": {"weekday": GYM_WEEKDAY}})
    hall = amenity("Community Hall", AmenityType.hall, {})
    await db_session.flush()
    for row in (court, gym, hall):
        db_session.add(
            AmenityStatus(amenity_id=row.id, society_id=society.id, crowd_level=CrowdLevel.quiet)
        )
    await db_session.flush()
    yield World(society, member, other, court, gym, hall)
    get_settings.cache_clear()  # tests enable dev auth through the environment


def _book(db_session, world: World, user: User, hour: int, day=TODAY) -> AmenityBooking:
    start = _slot_start(day, hour)
    booking = AmenityBooking(
        id=uuid.uuid4(),
        amenity_id=world.court.id,
        society_id=world.society.id,
        user_id=user.id,
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        status=AmenityBookingStatus.confirmed,
    )
    db_session.add(booking)
    return booking


async def test_amenities_require_auth(client: AsyncClient) -> None:
    amenity_id = uuid.uuid4()
    for path in (
        "/v1/amenities",
        f"/v1/amenities/{amenity_id}",
        f"/v1/amenities/{amenity_id}/slots",
        f"/v1/amenities/{amenity_id}/crowd",
    ):
        response = await client.get(path)
        assert response.status_code == 401, path


async def test_amenity_list_kinds_actions_and_live_status(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/amenities")
    assert response.status_code == 200
    cards = {card["name"]: card for card in response.json()}

    court = cards["Badminton 1"]
    assert (court["kind"], court["category"]) == ("bookable", "sports")
    assert court["actionLabel"] == "Book"
    assert court["imageUrl"] == "/images/amenities/badminton-1.jpg"
    assert court["detail"] == "Free now"

    gym = cards["Gym"]
    assert (gym["kind"], gym["action"], gym["statusLabel"]) == ("walk_in", "view", "Busy")
    assert gym["detail"] == "21 people in now"

    hall = cards["Community Hall"]
    assert (hall["kind"], hall["action"]) == ("space", "host")
    assert hall["actionLabel"] == "Host an event here"
    # Sports first, then fitness, then spaces.
    assert [c["name"] for c in response.json()] == ["Badminton 1", "Gym", "Community Hall"]


async def test_amenity_list_shows_next_free_slot(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _book(db_session, world, world.other, 10)
    _book(db_session, world, world.other, 11)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    cards = {c["name"]: c for c in (await client.get("/v1/amenities")).json()}
    court = cards["Badminton 1"]
    assert court["statusLabel"] == "Busy"
    assert court["detail"] == f"Next free: 12{EN}1 PM"


async def test_amenity_list_closed_outside_hours_and_for_maintenance(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    status = await db_session.get(AmenityStatus, world.gym.id)
    status.crowd_level, status.note = CrowdLevel.closed, "Closed for maintenance"
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    cards = {c["name"]: c for c in (await client.get("/v1/amenities")).json()}
    assert cards["Gym"]["statusLabel"] == "Closed"
    assert cards["Gym"]["detail"] == "Closed for maintenance"

    night = datetime(2030, 1, 1, 23, 0, tzinfo=IST).astimezone(UTC)
    monkeypatch.setattr("app.services.amenities.current_time", lambda: night)
    cards = {c["name"]: c for c in (await client.get("/v1/amenities")).json()}
    assert cards["Badminton 1"]["statusLabel"] == "Closed"
    assert cards["Badminton 1"]["detail"] == "Closed · opens tomorrow at 6 AM"


async def test_amenity_detail(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.get(f"/v1/amenities/{world.court.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["hoursLabel"] == f"6 AM {EN} 10 PM daily"
    assert 2 <= len(body["rules"]) <= 4
    assert (body["advanceDays"], body["maxHoursPerDay"]) == (7, 2)
    assert body["closureNote"] is None

    gym = (await client.get(f"/v1/amenities/{world.gym.id}")).json()
    assert (gym["advanceDays"], gym["maxHoursPerDay"]) == (0, 0)


async def test_amenity_detail_wrong_society_and_missing(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(id=uuid.uuid4(), name="Other", city="Pune", invite_code="AMEN02")
    db_session.add(other_society)
    await db_session.flush()
    foreign = Amenity(
        id=uuid.uuid4(),
        society_id=other_society.id,
        name="Foreign Court",
        amenity_type=AmenityType.court,
        capacity=4,
    )
    db_session.add(foreign)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    for path in ("", "/slots", "/crowd"):
        response = await client.get(f"/v1/amenities/{foreign.id}{path}")
        assert response.status_code == 404, path
        assert response.json()["code"] == "not_found"
    assert (await client.get(f"/v1/amenities/{uuid.uuid4()}")).status_code == 404


async def test_slots_show_every_state(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _book(db_session, world, world.other, 11)
    _book(db_session, world, world.member, 12)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get(f"/v1/amenities/{world.court.id}/slots")
    assert response.status_code == 200
    body = response.json()
    assert body["date"] == TODAY.isoformat()
    by_hour = {
        datetime.fromisoformat(slot["startsAt"]).astimezone(IST).hour: slot
        for slot in body["slots"]
    }
    assert sorted(by_hour) == list(range(6, 22))
    assert by_hour[9]["state"] == "past"
    assert by_hour[10]["state"] == "past"
    assert by_hour[11]["state"] == "booked"
    assert by_hour[11]["label"] is None and by_hour[11]["bookingId"] is None
    assert by_hour[12]["state"] == "yours" and by_hour[12]["bookingId"]
    assert by_hour[13]["state"] == "free"
    assert (by_hour[17]["state"], by_hour[17]["label"]) == ("blocked", "Kids coaching")


async def test_slots_recurring_block_follows_the_weekday(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    wednesday = (TODAY + timedelta(days=1)).isoformat()
    response = await client.get(f"/v1/amenities/{world.court.id}/slots", params={"day": wednesday})
    slots = response.json()["slots"]
    assert all(slot["state"] == "free" for slot in slots)


async def test_slots_validation(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    court = f"/v1/amenities/{world.court.id}/slots"
    too_far = (TODAY + timedelta(days=7)).isoformat()
    yesterday = (TODAY - timedelta(days=1)).isoformat()
    assert (await client.get(court, params={"day": too_far})).status_code == 422
    assert (await client.get(court, params={"day": yesterday})).status_code == 422
    assert (await client.get(court, params={"day": "not-a-date"})).status_code == 422
    not_bookable = await client.get(f"/v1/amenities/{world.gym.id}/slots")
    assert not_bookable.status_code == 422
    assert not_bookable.json()["code"] == "validation_error"


async def test_crowd_chart_marks_the_current_hour(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.get(f"/v1/amenities/{world.gym.id}/crowd")
    assert response.status_code == 200
    body = response.json()
    assert [h["hour"] for h in body["hours"]] == list(range(6, 22))
    assert body["currentHour"] == 10
    assert body["summary"] == "Usually busy now"
    assert next(h for h in body["hours"] if h["hour"] == 10)["level"] == "busy"

    tomorrow = (TODAY + timedelta(days=1)).isoformat()
    crowd_path = f"/v1/amenities/{world.gym.id}/crowd"
    later = (await client.get(crowd_path, params={"day": tomorrow})).json()
    assert later["currentHour"] is None
    assert later["summary"] == "Usually busiest around 10 AM"


async def test_crowd_only_for_walk_in(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    for amenity in (world.court, world.hall):
        response = await client.get(f"/v1/amenities/{amenity.id}/crowd")
        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"


def _iso(day, hour: int, minute: int = 0) -> str:
    start = datetime.combine(day, time(hour, minute), tzinfo=IST)
    return start.isoformat()


async def _day_slots(client: AsyncClient, amenity: Amenity, day) -> list[dict]:
    response = await client.get(
        f"/v1/amenities/{amenity.id}/slots", params={"day": day.isoformat()}
    )
    return response.json()["slots"]


async def _book_slot(client: AsyncClient, amenity: Amenity, day, hour: int):
    return await client.post(
        f"/v1/amenities/{amenity.id}/bookings", json={"startsAt": _iso(day, hour)}
    )


async def test_booking_endpoints_require_auth(client: AsyncClient) -> None:
    amenity_id = uuid.uuid4()
    body = {"startsAt": "2030-01-02T06:00:00+05:30"}
    assert (await client.post(f"/v1/amenities/{amenity_id}/bookings", json=body)).status_code == 401
    assert (await client.delete(f"/v1/amenities/bookings/{uuid.uuid4()}")).status_code == 401
    assert (await client.get("/v1/amenities/bookings/mine")).status_code == 401


async def test_book_then_cancel_a_slot(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    tomorrow = TODAY + timedelta(days=1)
    booked = await _book_slot(client, world.court, tomorrow, 6)
    assert booked.status_code == 201
    booking = booked.json()
    assert booking["amenityName"] == "Badminton 1"

    first = (await _day_slots(client, world.court, tomorrow))[0]
    assert (first["state"], first["bookingId"]) == ("yours", booking["id"])

    mine = (await client.get("/v1/amenities/bookings/mine")).json()
    assert [item["id"] for item in mine] == [booking["id"]]

    cancelled = await client.delete(f"/v1/amenities/bookings/{booking['id']}")
    assert cancelled.status_code == 200
    assert (await client.get("/v1/amenities/bookings/mine")).json() == []
    freed = (await _day_slots(client, world.court, tomorrow))[0]
    assert freed["state"] == "free"
    # The freed slot can be booked again.
    assert (await _book_slot(client, world.court, tomorrow, 6)).status_code == 201


async def test_booking_validation_rules(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    path = f"/v1/amenities/{world.court.id}/bookings"

    past = await _book_slot(client, world.court, TODAY, 9)
    assert (past.status_code, past.json()["code"]) == (422, "validation_error")

    half_hour = await client.post(path, json={"startsAt": _iso(TODAY + timedelta(days=1), 6, 30)})
    assert half_hour.status_code == 422

    too_far = await _book_slot(client, world.court, TODAY + timedelta(days=7), 8)
    assert too_far.status_code == 422

    too_early = await _book_slot(client, world.court, TODAY + timedelta(days=1), 5)
    assert too_early.status_code == 422

    assert (await client.post(path, json={})).status_code == 422
    assert (await client.post(path, json={"startsAt": "soon"})).status_code == 422

    walk_in = await _book_slot(client, world.gym, TODAY + timedelta(days=1), 8)
    assert walk_in.status_code == 422

    blocked = await _book_slot(client, world.court, TODAY, 17)
    assert (blocked.status_code, blocked.json()["code"]) == (409, "slot_blocked")
    assert "Kids coaching" in blocked.json()["message"]


async def test_third_hour_in_a_day_is_refused(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    day = TODAY + timedelta(days=2)
    assert (await _book_slot(client, world.court, day, 7)).status_code == 201
    assert (await _book_slot(client, world.court, day, 8)).status_code == 201
    third = await _book_slot(client, world.court, day, 9)
    assert (third.status_code, third.json()["code"]) == (422, "daily_limit")
    assert "2 hours a day" in third.json()["message"]
    # Another day is unaffected, and cancelling one frees the allowance.
    assert (await _book_slot(client, world.court, TODAY + timedelta(days=3), 9)).status_code == 201
    mine = (await client.get("/v1/amenities/bookings/mine")).json()
    first = next(
        item
        for item in mine
        if datetime.fromisoformat(item["startsAt"]).astimezone(IST).hour == 7
    )
    await client.delete(f"/v1/amenities/bookings/{first['id']}")
    assert (await _book_slot(client, world.court, day, 9)).status_code == 201


async def test_a_taken_slot_is_refused(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    day = TODAY + timedelta(days=1)
    _book(db_session, world, world.other, 18, day)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await _book_slot(client, world.court, day, 18)
    assert (response.status_code, response.json()["code"]) == (409, "slot_taken")
    assert response.json()["message"] == "Just taken, pick another slot."


async def test_database_blocks_a_double_booking_even_if_the_check_is_skipped(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    day = TODAY + timedelta(days=1)
    _book(db_session, world, world.other, 19, day)
    await db_session.flush()

    async def blind(*_args) -> bool:
        return False

    monkeypatch.setattr("app.services.amenity_bookings._slot_is_taken", blind)
    _enable_local_dev_auth(monkeypatch)
    response = await _book_slot(client, world.court, day, 19)
    assert (response.status_code, response.json()["code"]) == (409, "slot_taken")


async def test_cancel_rules(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    theirs = _book(db_session, world, world.other, 18, TODAY + timedelta(days=1))
    started = _book(db_session, world, world.member, 10)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.delete(f"/v1/amenities/bookings/{theirs.id}")).status_code == 404
    assert (await client.delete(f"/v1/amenities/bookings/{uuid.uuid4()}")).status_code == 404
    already = await client.delete(f"/v1/amenities/bookings/{started.id}")
    assert (already.status_code, already.json()["code"]) == (422, "validation_error")


async def test_my_bookings_lists_only_mine_and_upcoming(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    tomorrow = TODAY + timedelta(days=1)
    mine_later = _book(db_session, world, world.member, 15, tomorrow)
    mine_sooner = _book(db_session, world, world.member, 20)
    _book(db_session, world, world.member, 8)  # already over
    _book(db_session, world, world.other, 12, tomorrow)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    listed = (await client.get("/v1/amenities/bookings/mine")).json()
    assert [item["id"] for item in listed] == [str(mine_sooner.id), str(mine_later.id)]


async def test_booking_a_closed_amenity_is_refused(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    status = await db_session.get(AmenityStatus, world.court.id)
    status.crowd_level, status.note = CrowdLevel.closed, "Court resurfacing"
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await _book_slot(client, world.court, TODAY + timedelta(days=1), 8)
    assert (response.status_code, response.json()["code"]) == (409, "amenity_closed")
    assert response.json()["message"] == "Court resurfacing"
    slots = (await client.get(f"/v1/amenities/{world.court.id}/slots")).json()["slots"]
    assert {s["state"] for s in slots} <= {"past", "blocked"}


async def test_booking_wrong_society_amenity_is_not_found(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(id=uuid.uuid4(), name="Other", city="Pune", invite_code="AMEN03")
    db_session.add(other_society)
    await db_session.flush()
    foreign = Amenity(
        id=uuid.uuid4(),
        society_id=other_society.id,
        name="Foreign Court",
        amenity_type=AmenityType.court,
        capacity=4,
    )
    db_session.add(foreign)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await _book_slot(client, foreign, TODAY + timedelta(days=1), 8)
    assert response.status_code == 404
