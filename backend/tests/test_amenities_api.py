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
    monkeypatch.setattr("app.services.amenities._now", lambda: NOW)
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
    monkeypatch.setattr("app.services.amenities._now", lambda: night)
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
