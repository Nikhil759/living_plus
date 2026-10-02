import uuid

import pytest
from httpx import AsyncClient

from app.models import Flat, MembershipInvite, Society, Tower
from app.models.enums import MembershipInviteStatus, MembershipRole


@pytest.fixture
async def invite_setup(db_session):
    society = Society(
        id=uuid.uuid4(),
        name="Test Society",
        city="Gurgaon",
        invite_code="TESTCODE",
    )
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="702")
    invite = MembershipInvite(
        id=uuid.uuid4(),
        society_id=society.id,
        flat_id=flat.id,
        email="new.resident@example.com",
        role=MembershipRole.tenant,
        code="TEST-INVITE-1",
        status=MembershipInviteStatus.pending,
    )
    db_session.add_all([society, tower, flat, invite])
    await db_session.flush()
    return invite


@pytest.mark.asyncio
async def test_lookup_invite_happy_path(client: AsyncClient, invite_setup):
    response = await client.get("/v1/societies/lookup", params={"code": "TEST-INVITE-1"})
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Test Society"
    assert body["city"] == "Gurgaon"
    assert body["homes"] == 1
    assert body["members"] == 0


@pytest.mark.asyncio
async def test_lookup_invite_not_found(client: AsyncClient):
    response = await client.get("/v1/societies/lookup", params={"code": "NO-SUCH-CODE"})
    assert response.status_code == 404
    assert response.json()["code"] == "invalid_invite"
