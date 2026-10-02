import uuid

import pytest
from httpx import AsyncClient

from app.auth import get_current_user
from app.main import app
from app.models import Flat, MembershipInvite, Society, Tower, User
from app.models.enums import MembershipInviteStatus, MembershipRole


@pytest.fixture
async def master_invite_setup(db_session):
    society = Society(
        id=uuid.uuid4(),
        name="Prestige Meridian Park",
        city="Gurugram",
        invite_code="TESTCODE",
    )
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="702")
    invite = MembershipInvite(
        id=uuid.uuid4(),
        society_id=society.id,
        flat_id=flat.id,
        email="*",
        role=MembershipRole.tenant,
        code="LIVING-OPEN-50",
        status=MembershipInviteStatus.pending,
    )
    db_session.add_all([society, tower, flat, invite])
    await db_session.flush()
    return society, invite


@pytest.mark.asyncio
async def test_master_invite_lookup(client: AsyncClient, master_invite_setup):
    response = await client.get("/v1/societies/lookup", params={"code": "LIVING-OPEN-50"})
    assert response.status_code == 200
    assert response.json()["name"] == "Prestige Meridian Park"


@pytest.mark.asyncio
async def test_master_invite_stays_pending_after_redeem(
    client: AsyncClient, master_invite_setup, db_session
):
    _, invite = master_invite_setup
    user = User(
        id=uuid.uuid4(),
        supabase_uid="google:master-1",
        email="demo1@example.com",
        name="Demo One",
    )
    db_session.add(user)
    await db_session.flush()

    async def override_user():
        return user

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = await client.post(
            "/v1/invites/redeem",
            json={"inviteCode": "LIVING-OPEN-50"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    await db_session.refresh(invite)
    assert invite.status == MembershipInviteStatus.pending
    assert invite.consumed_at is None
