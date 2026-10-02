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
from app.models.enums import CrowdLevel, EventStatus


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

    get_settings.cache_clear()
