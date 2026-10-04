import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.models import (
    Amenity,
    AmenityStatus,
    AmenityType,
    Event,
    EventType,
    Flat,
    Membership,
    MembershipRole,
    MembershipStatus,
    Post,
    Profile,
    Society,
    Tower,
    User,
)
from app.models.enums import CrowdLevel, EventStatus, PostType


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
    amenity = Amenity(
        id=uuid.uuid4(),
        society_id=society.id,
        name="Gym",
        amenity_type=AmenityType.gym,
        capacity=20,
    )
    db_session.add(amenity)
    await db_session.flush()
    db_session.add(
        AmenityStatus(
            amenity_id=amenity.id,
            society_id=society.id,
            crowd_level=CrowdLevel.moderate,
            note="Moderate · 6 active",
        )
    )
    db_session.add(
        Post(
            id=uuid.uuid4(),
            society_id=society.id,
            author_id=user.id,
            body="**Water maintenance:** Tower B paused today.",
            post_type=PostType.notice,
            pinned=True,
        )
    )
    starts = datetime.now(UTC) + timedelta(days=2)
    db_session.add(
        Event(
            id=uuid.uuid4(),
            society_id=society.id,
            public_slug="evt-test",
            event_type=EventType.free,
            title="Test Game Night",
            host_id=user.id,
            location_label="Club Lounge",
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            status=EventStatus.published,
            tags=["FIFA"],
        )
    )
    await db_session.flush()
    return user


async def test_home_requires_auth_when_no_dev_user(client: AsyncClient) -> None:
    response = await client.get("/v1/home")
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorised"


async def test_home_returns_seeded_shape(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "demo@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()

    response = await client.get("/v1/home")
    assert response.status_code == 200
    body = response.json()
    assert body["resident"]["name"] == "Nikhil"
    assert body["resident"]["society"] == "Test Society"
    assert body["resident"]["interests"] == ["FIFA"]
    assert body["resident"]["isVisible"] is True
    assert len(body["events"]) == 1
    assert body["events"][0]["id"] == "evt-test"
    assert len(body["amenities"]) == 1
    assert body["digest"] is not None
    assert len(body["digest"]["items"]) >= 1
    assert body["digest"]["summary"]
    assert "tower b" in body["digest"]["summary"].lower()

    get_settings.cache_clear()


async def _neighbour(db_session, society_id: uuid.UUID, name: str, interests: list[str]) -> None:
    person = User(
        id=uuid.uuid4(), supabase_uid=f"seed:{name}", email=f"{name}@example.com", name=name
    )
    db_session.add(person)
    await db_session.flush()
    db_session.add(
        Profile(user_id=person.id, society_id=society_id, interests=interests, is_visible=True)
    )
    await db_session.flush()


async def test_match_card_finds_shared_interests_or_invites_adding_them(
    client: AsyncClient, demo_member: User, db_session, act_as
) -> None:
    profile = await db_session.get(Profile, demo_member.id)
    await _neighbour(db_session, profile.society_id, "Rohan", ["fifa", "cricket"])
    await _neighbour(db_session, profile.society_id, "Sana", ["books"])
    act_as(demo_member)

    match = (await client.get("/v1/home")).json()["match"]
    assert match["title"] == "Neighbours like you" and match["totalCount"] == 1
    assert match["actionHref"] == "/community/new"

    # No interests (e.g. a new Google sign-in): the card stays, asking for them.
    profile.interests = []
    await db_session.flush()
    match = (await client.get("/v1/home")).json()["match"]
    assert match["title"] == "Find people like you" and match["totalCount"] == 2
    assert match["actionLabel"] == "Add your interests" and match["actionHref"] == "/profile"
