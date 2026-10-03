import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models import (
    Event,
    EventStatus,
    EventTicket,
    EventType,
    Flat,
    Membership,
    MembershipRole,
    MembershipStatus,
    Profile,
    Society,
    Tower,
    User,
)
from app.models.enums import EventTicketStatus
from tests.test_me_api import _enable_local_dev_auth


@pytest.fixture
async def demo_member(db_session) -> User:
    society = Society(
        id=uuid.uuid4(),
        name="Test Society",
        city="Gurgaon",
        invite_code="TESTCODE",
    )
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="702")
    user = User(
        id=uuid.uuid4(),
        supabase_uid="seed:demo@aangan.app",
        email="demo@aangan.app",
        name="Nikhil",
    )
    db_session.add_all([society, tower, flat, user])
    await db_session.flush()
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
    db_session.add(
        Profile(
            user_id=user.id,
            society_id=society.id,
            interests=["FIFA"],
            is_visible=True,
        )
    )
    await db_session.flush()
    return user


def _future_start(days: int = 7) -> str:
    return (datetime.now(UTC) + timedelta(days=days)).replace(microsecond=0).isoformat()


async def test_events_create_requires_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/events",
        json={
            "title": "Morning Walk",
            "locationLabel": "Park",
            "startsAt": _future_start(),
        },
    )
    assert response.status_code == 401


async def test_events_create_free_published(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/events",
        json={
            "title": "Morning Walk",
            "locationLabel": "Central Park",
            "startsAt": _future_start(),
            "tags": ["walking"],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Morning Walk"
    assert body["location"] == "Central Park"
    assert body["priceInr"] == 0
    assert body["id"] == "morning-walk"
    assert body["capacity"] == 50
    assert body["category"] == "other"
    assert body["guestLimit"] == 0
    assert body["status"] == "published"
    assert body["isHost"] is True

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_create_rich_free_and_draft(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    starts = _future_start()
    ends = (datetime.now(UTC) + timedelta(days=7, hours=2)).replace(microsecond=0).isoformat()
    response = await client.post(
        "/v1/events",
        json={
            "title": "Terrace Yoga",
            "locationLabel": "Clubhouse Terrace",
            "startsAt": starts,
            "endsAt": ends,
            "description": "Gentle sunrise flow.",
            "category": "fitness",
            "capacity": 20,
            "guestLimit": 1,
            "whatToBring": "A mat and water.",
            "coverUrl": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
            "tags": ["yoga"],
            "saveAsDraft": True,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert body["category"] == "fitness"
    assert body["capacity"] == 20
    assert body["guestLimit"] == 1
    assert body["whatToBring"] == "A mat and water."
    assert body["description"] == "Gentle sunrise flow."
    assert body["imageUrl"].startswith("https://images.unsplash.com/")

    published = await client.patch(
        f"/v1/events/{body['id']}",
        json={"publish": True},
    )
    assert published.status_code == 200
    assert published.json()["status"] == "published"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_happy_path(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Board Games",
            "locationLabel": "Club Lounge",
            "startsAt": _future_start(),
        },
    )
    slug = created.json()["id"]
    later = (datetime.now(UTC) + timedelta(days=8)).replace(microsecond=0).isoformat()
    later_end = (datetime.now(UTC) + timedelta(days=8, hours=3)).replace(microsecond=0).isoformat()

    response = await client.patch(
        f"/v1/events/{slug}",
        json={
            "title": "Board Games Night",
            "locationLabel": "Roof",
            "startsAt": later,
            "endsAt": later_end,
            "description": "Bring a deck.",
            "category": "social",
            "capacity": 16,
            "guestLimit": 2,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Board Games Night"
    assert body["location"] == "Roof"
    assert body["description"] == "Bring a deck."
    assert body["category"] == "social"
    assert body["capacity"] == 16
    assert body["guestLimit"] == 2
    assert body["changeSummary"] == "Time and venue changed"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_requires_auth(client: AsyncClient) -> None:
    response = await client.patch("/v1/events/morning-walk", json={"title": "Walk"})
    assert response.status_code == 401


async def test_events_update_not_found(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.patch("/v1/events/missing-event", json={"title": "Nope"})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_forbidden_non_host(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == demo_member.id)
    )
    assert membership is not None
    other = User(
        id=uuid.uuid4(),
        supabase_uid="seed:host@aangan.app",
        email="host@aangan.app",
        name="Host",
    )
    db_session.add(other)
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=4)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=membership.society_id,
            public_slug="neighbours-walk",
            event_type=EventType.free,
            title="Neighbour Walk",
            host_id=other.id,
            location_label="Park",
            starts_at=starts,
            ends_at=starts + timedelta(hours=1),
            capacity=10,
            status=EventStatus.published,
        )
    )
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.patch("/v1/events/neighbours-walk", json={"title": "Stolen Walk"})
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_wrong_society(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER03",
    )
    other_host = User(
        id=uuid.uuid4(),
        supabase_uid="seed:other-host@aangan.app",
        email="other-host@aangan.app",
        name="Other Host",
    )
    db_session.add_all([other_society, other_host])
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=5)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=other_society.id,
            public_slug="other-edit",
            event_type=EventType.free,
            title="Other Meetup",
            host_id=other_host.id,
            location_label="Elsewhere",
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            capacity=10,
            status=EventStatus.published,
        )
    )
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.patch("/v1/events/other-edit", json={"title": "Nope"})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_rejects_end_before_start(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "Timing", "locationLabel": "Hall", "startsAt": _future_start()},
    )
    slug = created.json()["id"]
    starts = _future_start(8)
    ends = _future_start(7)
    response = await client.patch(f"/v1/events/{slug}", json={"startsAt": starts, "endsAt": ends})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_capacity_below_going(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "Full House", "locationLabel": "Hall", "startsAt": _future_start()},
    )
    slug = created.json()["id"]
    await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    response = await client.patch(f"/v1/events/{slug}", json={"capacity": 0})
    assert response.status_code == 422

    too_small = await client.patch(f"/v1/events/{slug}", json={"capacity": 1})
    assert too_small.status_code == 200
    assert too_small.json()["capacity"] == 1

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_update_locked_when_cancelled(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == demo_member.id)
    )
    assert membership is not None
    starts = datetime.now(UTC) + timedelta(days=3)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=membership.society_id,
            public_slug="rained-off",
            event_type=EventType.free,
            title="Rained Off",
            host_id=demo_member.id,
            location_label="Lawn",
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            capacity=20,
            status=EventStatus.cancelled,
        )
    )
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.patch("/v1/events/rained-off", json={"title": "Still on"})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_create_rejects_paid_type(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/events",
        json={
            "title": "Paid Workshop",
            "locationLabel": "Hall",
            "startsAt": _future_start(),
            "eventType": "paid",
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_rsvp_happy_path(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    create = await client.post(
        "/v1/events",
        json={
            "title": "Board Games",
            "locationLabel": "Club Lounge",
            "startsAt": _future_start(),
        },
    )
    slug = create.json()["id"]

    rsvp = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    assert rsvp.status_code == 200
    assert rsvp.json()["goingCount"] == 1

    again = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    assert again.status_code == 200
    assert again.json()["goingCount"] == 1

    left = await client.delete(f"/v1/events/{slug}/rsvp")
    assert left.status_code == 200
    assert left.json()["goingCount"] == 0

    detail = await client.get(f"/v1/events/{slug}")
    assert detail.status_code == 200
    assert detail.json()["viewerGoing"] is False
    assert detail.json()["goingCount"] == 0

    revived = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    assert revived.status_code == 200
    assert revived.json()["goingCount"] == 1

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_leave_requires_auth(client: AsyncClient) -> None:
    response = await client.delete("/v1/events/board-games/rsvp")
    assert response.status_code == 401


async def test_events_leave_not_found(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.delete("/v1/events/missing-event/rsvp")
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_rsvp_not_found(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/missing-event/rsvp", json={"qty": 1})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_rsvp_wrong_society(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER02",
    )
    other_host = User(
        id=uuid.uuid4(),
        supabase_uid="seed:other@aangan.app",
        email="other@aangan.app",
        name="Other Host",
    )
    db_session.add_all([other_society, other_host])
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=5)
    event = Event(
        id=uuid.uuid4(),
        society_id=other_society.id,
        public_slug="other-meetup",
        event_type=EventType.free,
        title="Other Meetup",
        host_id=other_host.id,
        location_label="Elsewhere",
        starts_at=starts,
        ends_at=starts + timedelta(hours=2),
        capacity=10,
        status=EventStatus.published,
    )
    db_session.add(event)
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/other-meetup/rsvp", json={"qty": 1})
    assert response.status_code == 404

    leave = await client.delete("/v1/events/other-meetup/rsvp")
    assert leave.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_rsvp_capacity_full(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == demo_member.id)
    )
    assert membership is not None
    starts = datetime.now(UTC) + timedelta(days=3)
    event = Event(
        id=uuid.uuid4(),
        society_id=membership.society_id,
        public_slug="tiny-gathering",
        event_type=EventType.free,
        title="Tiny Gathering",
        host_id=demo_member.id,
        location_label="Roof",
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        capacity=1,
        status=EventStatus.published,
    )
    db_session.add(event)
    await db_session.flush()

    other = User(
        id=uuid.uuid4(),
        supabase_uid="seed:guest@aangan.app",
        email="guest@aangan.app",
        name="Guest",
    )
    db_session.add(other)
    await db_session.flush()
    db_session.add(
        EventTicket(
            id=uuid.uuid4(),
            event_id=event.id,
            society_id=membership.society_id,
            user_id=other.id,
            qty=1,
            status=EventTicketStatus.confirmed,
        )
    )
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/tiny-gathering/rsvp", json={"qty": 1})
    assert response.status_code == 409
    assert response.json()["code"] == "capacity_full"

    from app.core.config import get_settings

    get_settings.cache_clear()
