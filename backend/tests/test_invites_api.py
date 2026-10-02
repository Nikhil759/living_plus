import uuid

import pytest
from httpx import AsyncClient

from app.auth import get_current_user
from app.main import app
from app.models import Flat, MembershipInvite, Society, Tower, User
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
    user = User(
        id=uuid.uuid4(),
        supabase_uid="google:abc",
        email="new.resident@example.com",
        name="New Resident",
    )
    invite = MembershipInvite(
        id=uuid.uuid4(),
        society_id=society.id,
        flat_id=flat.id,
        email="new.resident@example.com",
        role=MembershipRole.tenant,
        code="TEST-INVITE-1",
        status=MembershipInviteStatus.pending,
    )
    db_session.add_all([society, tower, flat, user, invite])
    await db_session.flush()
    return user, invite


@pytest.mark.asyncio
async def test_redeem_invite_happy_path(client: AsyncClient, invite_setup, db_session):
    user, invite = invite_setup

    async def override_user():
        return user

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = await client.post(
            "/v1/invites/redeem",
            json={"inviteCode": "TEST-INVITE-1"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    body = response.json()
    assert body["societyName"] == "Test Society"
    assert body["towerName"] == "Tower C"
    assert body["flatNo"] == "702"
    assert body["role"] == "tenant"

    await db_session.refresh(invite)
    assert invite.status == MembershipInviteStatus.consumed


@pytest.mark.asyncio
async def test_redeem_invite_email_mismatch(client: AsyncClient, invite_setup):
    user, _ = invite_setup
    user.email = "other@example.com"

    async def override_user():
        return user

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = await client.post(
            "/v1/invites/redeem",
            json={"inviteCode": "TEST-INVITE-1"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 403
    assert response.json()["code"] == "email_mismatch"


@pytest.mark.asyncio
async def test_redeem_open_guest_invite(client: AsyncClient, db_session):
    society = Society(
        id=uuid.uuid4(),
        name="Prestige Meridian Park",
        city="Gurugram",
        invite_code="TESTCODE",
    )
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="702")
    user = User(
        id=uuid.uuid4(),
        supabase_uid="google:guest",
        email="interviewer@gmail.com",
        name="Demo Guest",
    )
    invite = MembershipInvite(
        id=uuid.uuid4(),
        society_id=society.id,
        flat_id=flat.id,
        email="*",
        role=MembershipRole.tenant,
        code="PMG-TEST01",
        status=MembershipInviteStatus.pending,
    )
    db_session.add_all([society, tower, flat, user, invite])
    await db_session.flush()

    async def override_user():
        return user

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = await client.post(
            "/v1/invites/redeem",
            json={"inviteCode": "PMG-TEST01"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json()["societyName"] == "Prestige Meridian Park"


@pytest.mark.asyncio
async def test_redeem_invite_unauthorised(client: AsyncClient):
    response = await client.post(
        "/v1/invites/redeem",
        json={"inviteCode": "NOPE"},
    )
    assert response.status_code == 401
