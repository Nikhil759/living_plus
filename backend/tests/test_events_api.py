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


async def _add_same_society_member(
    db_session,
    demo_member: User,
    *,
    email: str,
    name: str,
    role: MembershipRole,
) -> User:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == demo_member.id)
    )
    assert membership is not None
    user = User(
        id=uuid.uuid4(),
        supabase_uid=f"seed:{email}",
        email=email,
        name=name,
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(
        Membership(
            id=uuid.uuid4(),
            user_id=user.id,
            society_id=membership.society_id,
            flat_id=membership.flat_id,
            role=role,
            status=MembershipStatus.approved,
        )
    )
    await db_session.flush()
    return user


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


async def test_events_create_paid_needs_price_and_stays_pending(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    missing = await client.post(
        "/v1/events",
        json={
            "title": "Paid Workshop",
            "locationLabel": "Hall",
            "startsAt": _future_start(),
            "eventType": "paid",
        },
    )
    assert missing.status_code == 422
    assert missing.json()["code"] == "validation_error"

    created = await client.post(
        "/v1/events",
        json={
            "title": "Paid Pottery",
            "locationLabel": "Community hall",
            "startsAt": _future_start(),
            "eventType": "paid",
            "priceInr": 400,
            "capacity": 12,
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "pending_approval"
    assert body["eventType"] == "paid"
    assert body["priceInr"] == 400
    assert body["id"] == "paid-pottery"

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


async def test_events_rsvp_guests_and_update(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Open House",
            "locationLabel": "Lawn",
            "startsAt": _future_start(),
            "capacity": 4,
            "guestLimit": 1,
        },
    )
    slug = created.json()["id"]

    too_many = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 3})
    assert too_many.status_code == 422
    assert too_many.json()["code"] == "validation_error"

    with_guest = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 2})
    assert with_guest.status_code == 200
    assert with_guest.json()["goingCount"] == 2

    detail = await client.get(f"/v1/events/{slug}")
    assert detail.json()["viewerGoing"] is True
    assert detail.json()["viewerGuestCount"] == 1

    solo = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    assert solo.status_code == 200
    assert solo.json()["goingCount"] == 1
    assert (await client.get(f"/v1/events/{slug}")).json()["viewerGuestCount"] == 0

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_rsvp_guests_count_toward_capacity(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Tiny Table",
            "locationLabel": "Cafe",
            "startsAt": _future_start(),
            "capacity": 2,
            "guestLimit": 2,
        },
    )
    slug = created.json()["id"]
    ok = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 2})
    assert ok.status_code == 200
    assert ok.json()["goingCount"] == 2

    overflow = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 3})
    assert overflow.status_code == 409
    assert overflow.json()["code"] == "capacity_full"

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


async def test_events_cancel_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/v1/events/morning-walk/cancel", json={"reason": "Rain"})
    assert response.status_code == 401


async def test_events_cancel_happy_path(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "Lawn Games", "locationLabel": "Lawn", "startsAt": _future_start()},
    )
    slug = created.json()["id"]
    await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})

    cancelled = await client.post(f"/v1/events/{slug}/cancel", json={"reason": "Storm warning"})
    assert cancelled.status_code == 200
    body = cancelled.json()
    assert body["status"] == "cancelled"
    assert body["cancelReason"] == "Storm warning"
    assert body["goingCount"] == 0

    rsvp = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    assert rsvp.status_code == 404

    event = await db_session.scalar(select(Event).where(Event.public_slug == slug))
    assert event is not None
    ticket = await db_session.scalar(select(EventTicket).where(EventTicket.event_id == event.id))
    assert ticket is not None
    assert ticket.status == EventTicketStatus.cancelled

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_requires_reason(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "No Reason", "locationLabel": "Hall", "startsAt": _future_start()},
    )
    slug = created.json()["id"]
    response = await client.post(f"/v1/events/{slug}/cancel", json={"reason": "no"})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_not_found(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/missing-event/cancel", json={"reason": "Gone"})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_forbidden_non_host(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == demo_member.id)
    )
    assert membership is not None
    other = User(
        id=uuid.uuid4(),
        supabase_uid="seed:cancel-host@aangan.app",
        email="cancel-host@aangan.app",
        name="Host",
    )
    db_session.add(other)
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=4)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=membership.society_id,
            public_slug="not-yours-cancel",
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
    response = await client.post("/v1/events/not-yours-cancel/cancel", json={"reason": "Mine now"})
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_wrong_society(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER04",
    )
    other_host = User(
        id=uuid.uuid4(),
        supabase_uid="seed:other-cancel@aangan.app",
        email="other-cancel@aangan.app",
        name="Other Host",
    )
    db_session.add_all([other_society, other_host])
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=5)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=other_society.id,
            public_slug="other-cancel",
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
    response = await client.post("/v1/events/other-cancel/cancel", json={"reason": "Nope"})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_locked_when_already_cancelled(
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
            public_slug="already-off",
            event_type=EventType.free,
            title="Already Off",
            host_id=demo_member.id,
            location_label="Lawn",
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            capacity=20,
            status=EventStatus.cancelled,
            cancel_reason="Rain",
        )
    )
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/already-off/cancel", json={"reason": "Still rain"})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_duplicate_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/v1/events/morning-walk/duplicate")
    assert response.status_code == 401


async def test_events_duplicate_happy_path(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Sunday Ride",
            "locationLabel": "Gate 2",
            "startsAt": _future_start(),
            "description": "Easy loop",
            "category": "sports",
            "capacity": 12,
            "guestLimit": 1,
            "whatToBring": "Helmet",
            "tags": ["cycling"],
        },
    )
    slug = created.json()["id"]
    await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 2})

    copied = await client.post(f"/v1/events/{slug}/duplicate")
    assert copied.status_code == 201
    body = copied.json()
    assert body["id"] != slug
    assert body["title"] == "Sunday Ride"
    assert body["status"] == "draft"
    assert body["description"] == "Easy loop"
    assert body["category"] == "sports"
    assert body["capacity"] == 12
    assert body["guestLimit"] == 1
    assert body["whatToBring"] == "Helmet"
    assert body["goingCount"] == 0
    assert body["isHost"] is True

    original = await client.get(f"/v1/events/{slug}")
    assert original.status_code == 200
    assert original.json()["status"] == "published"
    assert original.json()["goingCount"] == 2

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_duplicate_not_found(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/missing-event/duplicate")
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_duplicate_forbidden_non_host(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    membership = await db_session.scalar(
        select(Membership).where(Membership.user_id == demo_member.id)
    )
    assert membership is not None
    other = User(
        id=uuid.uuid4(),
        supabase_uid="seed:dup-host@aangan.app",
        email="dup-host@aangan.app",
        name="Host",
    )
    db_session.add(other)
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=4)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=membership.society_id,
            public_slug="not-yours-dup",
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
    response = await client.post("/v1/events/not-yours-dup/duplicate")
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_duplicate_wrong_society(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER05",
    )
    other_host = User(
        id=uuid.uuid4(),
        supabase_uid="seed:other-dup@aangan.app",
        email="other-dup@aangan.app",
        name="Other Host",
    )
    db_session.add_all([other_society, other_host])
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=5)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=other_society.id,
            public_slug="other-dup",
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
    response = await client.post("/v1/events/other-dup/duplicate")
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_create_society_forbidden_for_resident(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/events",
        json={
            "title": "Diwali Mela",
            "locationLabel": "Lawn",
            "startsAt": _future_start(),
            "eventType": "society",
        },
    )
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_create_society_pending_for_committee(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    response = await client.post(
        "/v1/events",
        json={
            "title": "Diwali Mela",
            "locationLabel": "Central lawn",
            "startsAt": _future_start(),
            "eventType": "society",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending_approval"
    assert response.json()["eventType"] == "society"
    get_settings.cache_clear()


async def test_events_approve_and_reject_committee_only(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Paid Pottery",
            "locationLabel": "Hall",
            "startsAt": _future_start(),
            "eventType": "paid",
            "priceInr": 500,
        },
    )
    slug = created.json()["id"]

    host_approve = await client.post(f"/v1/events/{slug}/approve")
    assert host_approve.status_code == 403
    assert host_approve.json()["code"] == "forbidden"

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    approved = await client.post(f"/v1/events/{slug}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "published"
    assert approved.json()["priceInr"] == 500

    again = await client.post(f"/v1/events/{slug}/approve")
    assert again.status_code == 422
    get_settings.cache_clear()


async def test_events_reject_then_host_resubmits(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Paid Yoga",
            "locationLabel": "Studio",
            "startsAt": _future_start(),
            "eventType": "paid",
            "priceInr": 250,
        },
    )
    slug = created.json()["id"]

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    short = await client.post(f"/v1/events/{slug}/reject", json={"reason": "no"})
    assert short.status_code == 422

    rejected = await client.post(
        f"/v1/events/{slug}/reject", json={"reason": "Hall is already booked."}
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["rejectionReason"] == "Hall is already booked."

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "demo@aangan.app")
    get_settings.cache_clear()
    resubmit = await client.patch(f"/v1/events/{slug}", json={"publish": True})
    assert resubmit.status_code == 200
    assert resubmit.json()["status"] == "pending_approval"
    assert resubmit.json()["rejectionReason"] is None
    get_settings.cache_clear()


async def test_events_approve_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/v1/events/paid-pottery/approve")
    assert response.status_code == 401


async def test_events_reject_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/v1/events/paid-pottery/reject", json={"reason": "No hall"})
    assert response.status_code == 401


async def test_events_approve_not_found(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    response = await client.post("/v1/events/missing-event/approve")
    assert response.status_code == 404
    get_settings.cache_clear()


async def test_events_approve_wrong_society(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER06",
    )
    other_host = User(
        id=uuid.uuid4(),
        supabase_uid="seed:other-paid@aangan.app",
        email="other-paid@aangan.app",
        name="Other Host",
    )
    db_session.add_all([other_society, other_host])
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=5)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=other_society.id,
            public_slug="other-paid",
            event_type=EventType.paid,
            title="Other Workshop",
            host_id=other_host.id,
            location_label="Elsewhere",
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            capacity=10,
            price_paise=40000,
            status=EventStatus.pending_approval,
        )
    )
    await db_session.flush()

    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    response = await client.post("/v1/events/other-paid/approve")
    assert response.status_code == 404
    get_settings.cache_clear()


async def test_events_committee_can_cancel(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "Lawn Games", "locationLabel": "Lawn", "startsAt": _future_start()},
    )
    slug = created.json()["id"]

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    cancelled = await client.post(f"/v1/events/{slug}/cancel", json={"reason": "Noise complaint"})
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["cancelReason"] == "Noise complaint"
    get_settings.cache_clear()


async def test_events_waitlist_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/v1/events/tiny-table/waitlist", json={"qty": 1})
    assert response.status_code == 401


async def test_events_waitlist_join_leave_and_promote(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="waiter@aangan.app",
        name="Waiter",
        role=MembershipRole.tenant,
    )
    await _add_same_society_member(
        db_session,
        demo_member,
        email="later@aangan.app",
        name="Later",
        role=MembershipRole.tenant,
    )
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Tiny Table",
            "locationLabel": "Cafe",
            "startsAt": _future_start(),
            "capacity": 1,
        },
    )
    slug = created.json()["id"]
    filled = await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    assert filled.status_code == 200
    assert filled.json()["goingCount"] == 1

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "waiter@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    waiting = await client.post(f"/v1/events/{slug}/waitlist", json={"qty": 1})
    assert waiting.status_code == 200
    assert waiting.json()["viewerWaitlisted"] is True
    assert waiting.json()["waitlistCount"] == 1
    assert waiting.json()["goingCount"] == 1
    assert waiting.json()["viewerGoing"] is False

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "later@aangan.app")
    get_settings.cache_clear()
    second = await client.post(f"/v1/events/{slug}/waitlist", json={"qty": 1})
    assert second.status_code == 200
    assert second.json()["waitlistCount"] == 2

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "demo@aangan.app")
    get_settings.cache_clear()
    left = await client.delete(f"/v1/events/{slug}/rsvp")
    assert left.status_code == 200
    assert left.json()["goingCount"] == 1

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "waiter@aangan.app")
    get_settings.cache_clear()
    promoted = await client.get(f"/v1/events/{slug}")
    assert promoted.json()["viewerGoing"] is True
    assert promoted.json()["viewerWaitlisted"] is False
    assert promoted.json()["waitlistCount"] == 1

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "later@aangan.app")
    get_settings.cache_clear()
    still_waiting = await client.get(f"/v1/events/{slug}")
    assert still_waiting.json()["viewerWaitlisted"] is True
    assert still_waiting.json()["viewerGoing"] is False

    dropped = await client.delete(f"/v1/events/{slug}/waitlist")
    assert dropped.status_code == 200
    assert dropped.json()["viewerWaitlisted"] is False
    assert dropped.json()["waitlistCount"] == 0
    get_settings.cache_clear()


async def test_events_waitlist_not_found(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/missing-event/waitlist", json={"qty": 1})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_waitlist_wrong_society(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER07",
    )
    other_host = User(
        id=uuid.uuid4(),
        supabase_uid="seed:other-wait@aangan.app",
        email="other-wait@aangan.app",
        name="Other Host",
    )
    db_session.add_all([other_society, other_host])
    await db_session.flush()
    starts = datetime.now(UTC) + timedelta(days=5)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=other_society.id,
            public_slug="other-wait",
            event_type=EventType.free,
            title="Other Meetup",
            host_id=other_host.id,
            location_label="Elsewhere",
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            capacity=1,
            status=EventStatus.published,
        )
    )
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/events/other-wait/waitlist", json={"qty": 1})
    assert response.status_code == 404

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_waitlist_rejects_when_already_going(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "Open Table", "locationLabel": "Lawn", "startsAt": _future_start()},
    )
    slug = created.json()["id"]
    await client.post(f"/v1/events/{slug}/rsvp", json={"qty": 1})
    response = await client.post(f"/v1/events/{slug}/waitlist", json={"qty": 1})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_waitlist_paid_does_not_auto_promote(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _add_same_society_member(
        db_session,
        demo_member,
        email="committee@aangan.app",
        name="Committee Lead",
        role=MembershipRole.committee,
    )
    neighbour = await _add_same_society_member(
        db_session,
        demo_member,
        email="paid-goer@aangan.app",
        name="Goer",
        role=MembershipRole.tenant,
    )
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Paid Class",
            "locationLabel": "Studio",
            "startsAt": _future_start(),
            "eventType": "paid",
            "priceInr": 300,
            "capacity": 1,
        },
    )
    slug = created.json()["id"]
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    approved = await client.post(f"/v1/events/{slug}/approve")
    assert approved.status_code == 200

    event = await db_session.scalar(select(Event).where(Event.public_slug == slug))
    assert event is not None
    db_session.add(
        EventTicket(
            id=uuid.uuid4(),
            event_id=event.id,
            society_id=event.society_id,
            user_id=neighbour.id,
            qty=1,
            status=EventTicketStatus.confirmed,
        )
    )
    await db_session.flush()

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "demo@aangan.app")
    get_settings.cache_clear()
    waiting = await client.post(f"/v1/events/{slug}/waitlist", json={"qty": 1})
    assert waiting.status_code == 200
    assert waiting.json()["viewerWaitlisted"] is True

    ticket = await db_session.scalar(
        select(EventTicket).where(
            EventTicket.event_id == event.id,
            EventTicket.user_id == neighbour.id,
        )
    )
    assert ticket is not None
    ticket.status = EventTicketStatus.cancelled
    await db_session.flush()
    await db_session.commit()

    still = await client.get(f"/v1/events/{slug}")
    assert still.json()["viewerWaitlisted"] is True
    assert still.json()["viewerGoing"] is False
    assert still.json()["goingCount"] == 0
    get_settings.cache_clear()


async def test_events_create_weekly_series_and_cancel_one(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Tower C Book Club",
            "locationLabel": "Cafe lounge",
            "startsAt": _future_start(14),
            "recurrence": "weekly",
            "recurrenceCount": 4,
        },
    )
    assert created.status_code == 201
    first = created.json()
    assert first["recurrence"] == "weekly"
    assert first["seriesId"]
    assert first["recurrenceLabel"]
    assert first["status"] == "published"

    hosting = await client.get("/v1/events", params={"tab": "hosting"})
    series = [item for item in hosting.json() if item.get("seriesId") == first["seriesId"]]
    assert len(series) == 4
    starts = sorted(item["startsAt"] for item in series)
    first_start = datetime.fromisoformat(starts[0])
    assert datetime.fromisoformat(starts[1]) - first_start == timedelta(days=7)
    assert datetime.fromisoformat(starts[3]) - first_start == timedelta(days=21)

    cancelled = await client.post(
        f"/v1/events/{first['id']}/cancel",
        json={"reason": "Host is travelling", "scope": "this"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    hosting = await client.get("/v1/events", params={"tab": "hosting"})
    series = [item for item in hosting.json() if item.get("seriesId") == first["seriesId"]]
    assert sum(1 for item in series if item["status"] == "published") == 3
    assert sum(1 for item in series if item["status"] == "cancelled") == 1

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_later_series_dates(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Saturday Ride",
            "locationLabel": "Gate 2",
            "startsAt": _future_start(10),
            "recurrence": "weekly",
            "recurrenceCount": 4,
        },
    )
    series_id = created.json()["seriesId"]
    hosting = await client.get("/v1/events", params={"tab": "hosting"})
    ordered = sorted(
        (item for item in hosting.json() if item.get("seriesId") == series_id),
        key=lambda item: item["startsAt"],
    )
    second = ordered[1]
    cancelled = await client.post(
        f"/v1/events/{second['id']}/cancel",
        json={"reason": "Break week onwards", "scope": "series"},
    )
    assert cancelled.status_code == 200

    hosting = await client.get("/v1/events", params={"tab": "hosting"})
    by_id = {
        item["id"]: item["status"]
        for item in hosting.json()
        if item.get("seriesId") == series_id
    }
    assert by_id[ordered[0]["id"]] == "published"
    assert by_id[ordered[1]["id"]] == "cancelled"
    assert by_id[ordered[2]["id"]] == "cancelled"
    assert by_id[ordered[3]["id"]] == "cancelled"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_draft_does_not_expand_series(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={
            "title": "Draft Series",
            "locationLabel": "Hall",
            "startsAt": _future_start(),
            "recurrence": "weekly",
            "recurrenceCount": 4,
            "saveAsDraft": True,
        },
    )
    assert created.status_code == 201
    assert created.json()["status"] == "draft"
    assert created.json()["seriesId"] is None

    hosting = await client.get("/v1/events", params={"tab": "hosting"})
    titles = [item["title"] for item in hosting.json() if item["title"] == "Draft Series"]
    assert len(titles) == 1

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_series_count_too_high(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/events",
        json={
            "title": "Too Many",
            "locationLabel": "Hall",
            "startsAt": _future_start(),
            "recurrence": "weekly",
            "recurrenceCount": 13,
        },
    )
    assert response.status_code == 422

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_cancel_series_requires_a_series(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    created = await client.post(
        "/v1/events",
        json={"title": "One Off", "locationLabel": "Park", "startsAt": _future_start()},
    )
    slug = created.json()["id"]
    response = await client.post(
        f"/v1/events/{slug}/cancel",
        json={"reason": "Not a series", "scope": "series"},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()
