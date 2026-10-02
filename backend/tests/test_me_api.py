import uuid

import pytest
from httpx import AsyncClient

from app.models import (
    Flat,
    Membership,
    MembershipRole,
    MembershipStatus,
    Profile,
    Society,
    Tower,
    User,
)


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


def _enable_local_dev_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "demo@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()


@pytest.fixture
async def member_without_profile(db_session) -> User:
    society = Society(
        id=uuid.uuid4(),
        name="No Profile Society",
        city="Gurgaon",
        invite_code="NOPROF1",
    )
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower A")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="101")
    user = User(
        id=uuid.uuid4(),
        supabase_uid="seed:noprofile@aangan.app",
        email="noprofile@aangan.app",
        name="New Member",
    )
    db_session.add_all([society, tower, flat, user])
    await db_session.flush()
    db_session.add(
        Membership(
            id=uuid.uuid4(),
            user_id=user.id,
            society_id=society.id,
            flat_id=flat.id,
            role=MembershipRole.tenant,
            status=MembershipStatus.approved,
        )
    )
    await db_session.flush()
    return user


async def test_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/v1/me")
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorised"


async def test_me_get_creates_profile_when_missing(
    client: AsyncClient,
    member_without_profile: User,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ENV", "local")
    monkeypatch.setenv("LOCAL_DEV_AUTH_EMAIL", "noprofile@aangan.app")
    from app.core.config import get_settings

    get_settings.cache_clear()

    profile = await db_session.get(Profile, member_without_profile.id)
    assert profile is None

    response = await client.get("/v1/me")
    assert response.status_code == 200
    body = response.json()
    assert body["interests"] == []
    assert body["isVisible"] is False

    profile = await db_session.get(Profile, member_without_profile.id)
    assert profile is not None
    assert profile.society_id is not None

    get_settings.cache_clear()


async def test_me_returns_profile_fields(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/me")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Nikhil"
    assert body["interests"] == ["FIFA"]
    assert body["isVisible"] is True
    assert body["showFlat"] is False

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_patch_me_updates_profile(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.patch(
        "/v1/me",
        json={
            "bio": "Weekend FIFA host",
            "interests": ["FIFA", "Running"],
            "isVisible": False,
            "showFlat": True,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["bio"] == "Weekend FIFA host"
    assert body["interests"] == ["FIFA", "Running"]
    assert body["isVisible"] is False
    assert body["showFlat"] is True

    get_response = await client.get("/v1/me")
    assert get_response.json()["bio"] == "Weekend FIFA host"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_patch_me_empty_body_validation(
    client: AsyncClient, demo_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.patch("/v1/me", json={})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_patch_me_rejects_wrong_society_profile(
    client: AsyncClient, demo_member: User, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other_society = Society(
        id=uuid.uuid4(),
        name="Other",
        city="Gurgaon",
        invite_code="OTHER01",
    )
    db_session.add(other_society)
    await db_session.flush()
    profile = await db_session.get(Profile, demo_member.id)
    assert profile is not None
    profile.society_id = other_society.id
    await db_session.flush()

    _enable_local_dev_auth(monkeypatch)
    response = await client.patch("/v1/me", json={"bio": "Nope"})
    assert response.status_code == 403
    assert response.json()["code"] == "profile_society_mismatch"

    from app.core.config import get_settings

    get_settings.cache_clear()
