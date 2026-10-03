import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient

from app.models import (
    Event,
    EventCategory,
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


def _future(days: int = 5, hours: int = 0) -> datetime:
    return datetime.now(UTC) + timedelta(days=days, hours=hours)


def _past(days: int = 5) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


async def _add_member(
    db_session,
    *,
    society: Society,
    tower: Tower,
    email: str,
    name: str,
    flat_no: str,
    role: MembershipRole,
    visible: bool = True,
) -> User:
    user = User(
        id=uuid.uuid4(),
        supabase_uid=f"seed:{email}",
        email=email,
        name=name,
    )
    flat = Flat(
        id=uuid.uuid4(),
        society_id=society.id,
        tower_id=tower.id,
        flat_no=flat_no,
    )
    db_session.add_all([user, flat])
    await db_session.flush()
    db_session.add(
        Membership(
            id=uuid.uuid4(),
            user_id=user.id,
            society_id=society.id,
            flat_id=flat.id,
            role=role,
            status=MembershipStatus.approved,
        )
    )
    db_session.add(
        Profile(
            user_id=user.id,
            society_id=society.id,
            interests=["FIFA"],
            is_visible=visible,
        )
    )
    await db_session.flush()
    return user


def _event(
    *,
    society_id: uuid.UUID,
    host_id: uuid.UUID,
    slug: str,
    title: str,
    status: EventStatus = EventStatus.published,
    event_type: EventType = EventType.free,
    category: EventCategory = EventCategory.social,
    starts: datetime | None = None,
    ends: datetime | None = None,
    cover_url: str | None = None,
    tags: list[str] | None = None,
    description: str | None = None,
) -> Event:
    start = starts or _future()
    return Event(
        id=uuid.uuid4(),
        society_id=society_id,
        public_slug=slug,
        event_type=event_type,
        title=title,
        description=description,
        cover_url=cover_url,
        host_id=host_id,
        location_label="Park gate",
        starts_at=start,
        ends_at=ends or start + timedelta(hours=2),
        capacity=20,
        status=status,
        category=category,
        tags=tags or [],
    )


@pytest.fixture
async def list_world(db_session) -> dict[str, Any]:
    society = Society(
        id=uuid.uuid4(),
        name="Test Society",
        city="Gurgaon",
        invite_code="LISTSOC1",
    )
    other_society = Society(
        id=uuid.uuid4(),
        name="Other Society",
        city="Gurgaon",
        invite_code="LISTSOC2",
    )
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    other_tower = Tower(id=uuid.uuid4(), society_id=other_society.id, name="Tower A")
    db_session.add_all([society, other_society, tower, other_tower])
    await db_session.flush()

    resident = await _add_member(
        db_session,
        society=society,
        tower=tower,
        email="demo@aangan.app",
        name="Nikhil Bansal",
        flat_no="702",
        role=MembershipRole.owner,
    )
    neighbour = await _add_member(
        db_session,
        society=society,
        tower=tower,
        email="neighbour@aangan.app",
        name="Meera Shah",
        flat_no="101",
        role=MembershipRole.tenant,
        visible=True,
    )
    hidden = await _add_member(
        db_session,
        society=society,
        tower=tower,
        email="hidden@aangan.app",
        name="Quiet Resident",
        flat_no="202",
        role=MembershipRole.tenant,
        visible=False,
    )
    committee = await _add_member(
        db_session,
        society=society,
        tower=tower,
        email="committee@aangan.app",
        name="Committee Lead",
        flat_no="301",
        role=MembershipRole.committee,
    )
    outsider = await _add_member(
        db_session,
        society=other_society,
        tower=other_tower,
        email="other@aangan.app",
        name="Other Host",
        flat_no="001",
        role=MembershipRole.owner,
    )

    walk = _event(
        society_id=society.id,
        host_id=resident.id,
        slug="sunday-walk",
        title="Sunday morning walk",
        category=EventCategory.fitness,
        cover_url="https://cdn.example/walk.jpg",
        tags=["walking", "wellness"],
        description="Easy loop from the park gate.",
    )
    draft = _event(
        society_id=society.id,
        host_id=resident.id,
        slug="draft-yoga",
        title="Draft yoga",
        status=EventStatus.draft,
        category=EventCategory.fitness,
    )
    pending = _event(
        society_id=society.id,
        host_id=resident.id,
        slug="pending-pottery",
        title="Paid pottery workshop",
        status=EventStatus.pending_approval,
        event_type=EventType.paid,
        category=EventCategory.learning,
    )
    neighbour_draft = _event(
        society_id=society.id,
        host_id=neighbour.id,
        slug="secret-draft",
        title="Neighbour draft",
        status=EventStatus.draft,
    )
    past = _event(
        society_id=society.id,
        host_id=neighbour.id,
        slug="old-meetup",
        title="Last month meetup",
        starts=_past(10),
        ends=_past(10) + timedelta(hours=2),
        category=EventCategory.social,
    )
    cancelled = _event(
        society_id=society.id,
        host_id=neighbour.id,
        slug="cancelled-run",
        title="Cancelled run",
        status=EventStatus.cancelled,
        category=EventCategory.sports,
    )
    other_event = _event(
        society_id=other_society.id,
        host_id=outsider.id,
        slug="sunday-walk",
        title="Other society walk",
        cover_url="https://cdn.example/other.jpg",
    )
    db_session.add_all([walk, draft, pending, neighbour_draft, past, cancelled, other_event])
    await db_session.flush()

    for user in (neighbour, hidden):
        db_session.add(
            EventTicket(
                id=uuid.uuid4(),
                event_id=walk.id,
                society_id=society.id,
                user_id=user.id,
                qty=1,
                status=EventTicketStatus.confirmed,
            )
        )
    db_session.add(
        EventTicket(
            id=uuid.uuid4(),
            event_id=walk.id,
            society_id=society.id,
            user_id=resident.id,
            qty=1,
            status=EventTicketStatus.confirmed,
        )
    )
    await db_session.flush()
    return {
        "resident": resident,
        "neighbour": neighbour,
        "committee": committee,
        "walk": walk,
        "draft": draft,
        "pending": pending,
        "past": past,
        "cancelled": cancelled,
        "other_event": other_event,
    }


async def test_events_list_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/v1/events")
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorised"


async def test_events_list_upcoming_excludes_other_society_and_drafts(
    client: AsyncClient, list_world: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/events")
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert "sunday-walk" in ids
    assert "cancelled-run" in ids
    assert "pending-pottery" in ids
    assert "draft-yoga" not in ids
    assert "secret-draft" not in ids
    assert "old-meetup" not in ids
    walk = next(item for item in response.json() if item["id"] == "sunday-walk")
    assert walk["imageUrl"] == "https://cdn.example/walk.jpg"
    assert walk["location"] == "Park gate"
    assert walk["eventType"] == "free"
    assert walk["category"] == "fitness"
    assert walk["goingCount"] == 3
    assert {person["name"] for person in walk["going"]} == {"Meera", "Nikhil"}
    assert walk["viewerGoing"] is True
    assert walk["isHost"] is True
    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_list_hosting_includes_own_drafts_not_others(
    client: AsyncClient, list_world: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/events", params={"tab": "hosting"})
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert "draft-yoga" in ids
    assert "pending-pottery" in ids
    assert "sunday-walk" in ids
    assert "secret-draft" not in ids
    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_list_going_and_past_and_filters(
    client: AsyncClient, list_world: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    going = await client.get("/v1/events", params={"tab": "going"})
    assert going.status_code == 200
    assert [item["id"] for item in going.json()] == ["sunday-walk"]

    past = await client.get("/v1/events", params={"tab": "past"})
    assert past.status_code == 200
    assert [item["id"] for item in past.json()] == ["old-meetup"]

    fitness = await client.get("/v1/events", params={"category": "fitness"})
    assert {item["id"] for item in fitness.json()} == {"sunday-walk"}

    paid = await client.get("/v1/events", params={"event_type": "paid"})
    assert [item["id"] for item in paid.json()] == ["pending-pottery"]

    search = await client.get("/v1/events", params={"q": "no-such-event"})
    assert search.json() == []
    titled = await client.get("/v1/events", params={"q": "pottery"})
    assert [item["id"] for item in titled.json()] == ["pending-pottery"]
    tagged = await client.get("/v1/events", params={"q": "walking"})
    assert [item["id"] for item in tagged.json()] == ["sunday-walk"]
    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_get_maps_cover_and_hides_full_list_from_neighbours(
    client: AsyncClient, list_world: dict[str, Any], db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    host_view = await client.get("/v1/events/sunday-walk")
    assert host_view.status_code == 200
    body = host_view.json()
    assert body["imageUrl"] == "https://cdn.example/walk.jpg"
    assert body["description"] == "Easy loop from the park gate."
    assert body["hostProfile"]["name"] == "Nikhil Bansal"
    assert body["attendees"] is not None
    assert {row["fullName"] for row in body["attendees"]} == {
        "Nikhil Bansal",
        "Meera Shah",
        "Quiet Resident",
    }

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "neighbour@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    neighbour_view = await client.get("/v1/events/sunday-walk")
    assert neighbour_view.status_code == 200
    neighbour_body = neighbour_view.json()
    assert neighbour_body["attendees"] is None
    assert {person["name"] for person in neighbour_body["going"]} == {"Meera", "Nikhil"}
    get_settings.cache_clear()


async def test_events_get_pending_visible_to_host_and_committee_only(
    client: AsyncClient, list_world: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "neighbour@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    hidden = await client.get("/v1/events/pending-pottery")
    assert hidden.status_code == 404

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "committee@aangan.app")
    get_settings.cache_clear()
    committee = await client.get("/v1/events/pending-pottery")
    assert committee.status_code == 200
    assert committee.json()["isCommittee"] is True
    assert committee.json()["attendees"] == []

    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "demo@aangan.app")
    get_settings.cache_clear()
    host = await client.get("/v1/events/pending-pottery")
    assert host.status_code == 200
    assert host.json()["isHost"] is True
    get_settings.cache_clear()


async def test_events_get_wrong_society(
    client: AsyncClient, list_world: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    # Same slug exists in another society; this member must not see that row.
    response = await client.get("/v1/events/sunday-walk")
    assert response.status_code == 200
    assert response.json()["title"] == "Sunday morning walk"
    assert response.json()["imageUrl"] == "https://cdn.example/walk.jpg"
    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_events_list_wrong_society_empty_for_outsider(
    client: AsyncClient, list_world: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "other@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()
    response = await client.get("/v1/events")
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert ids == ["sunday-walk"]
    assert response.json()[0]["title"] == "Other society walk"
    missing = await client.get("/v1/events/pending-pottery")
    assert missing.status_code == 404
    get_settings.cache_clear()
