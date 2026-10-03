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
