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
from tests.test_me_api import _enable_local_dev_auth

# 1x1 PNG
_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
async def upload_member(db_session) -> User:
    society = Society(
        id=uuid.uuid4(),
        name="Test Society",
        city="Gurgaon",
        invite_code="UPLCODE1",
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
        Profile(user_id=user.id, society_id=society.id, interests=["FIFA"], is_visible=True)
    )
    await db_session.flush()
    return user


async def test_event_cover_upload_requires_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/uploads/event-covers",
        files={"file": ("cover.png", _PNG, "image/png")},
    )
    assert response.status_code == 401


async def test_event_cover_upload_and_fetch(
    client: AsyncClient, upload_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    uploaded = await client.post(
        "/v1/uploads/event-covers",
        files={"file": ("cover.png", _PNG, "image/png")},
    )
    assert uploaded.status_code == 200
    url = uploaded.json()["url"]
    assert url.startswith("/v1/uploads/event-covers/")
    assert url.endswith(".png")

    fetched = await client.get(url)
    assert fetched.status_code == 200
    assert fetched.content.startswith(b"\x89PNG")

    created = await client.post(
        "/v1/events",
        json={
            "title": "Photo Walk",
            "locationLabel": "Park",
            "startsAt": "2030-01-01T01:30:00+00:00",
            "coverUrl": url,
        },
    )
    assert created.status_code == 201
    assert created.json()["imageUrl"] == url

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_event_cover_rejects_non_image(
    client: AsyncClient, upload_member: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/uploads/event-covers",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"

    from app.core.config import get_settings

    get_settings.cache_clear()


async def test_event_cover_get_rejects_traversal(client: AsyncClient) -> None:
    response = await client.get("/v1/uploads/event-covers/../config.py")
    assert response.status_code == 404


async def test_event_cover_missing_file(client: AsyncClient) -> None:
    response = await client.get(
        "/v1/uploads/event-covers/11111111-1111-1111-1111-111111111111.png"
    )
    assert response.status_code == 404
