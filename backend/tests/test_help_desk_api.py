import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.auth import get_current_user
from app.main import app
from app.models import (
    Feedback,
    Flat,
    Membership,
    MembershipRole,
    MembershipStatus,
    Notification,
    Society,
    Tower,
    User,
    Vendor,
)
from app.models.enums import VendorCategory


@dataclass
class World:
    society: Society
    tower_b: Tower
    tower_c: Tower
    other_tower: Tower
    vendor: Vendor
    other_vendor: Vendor
    nikhil: User  # Tower C
    meera: User  # Tower B
    committee: User
    outsider: User  # another society
    outside_committee: User  # committee of another society


def _user(name: str) -> User:
    slug = name.lower().replace(" ", ".")
    return User(
        id=uuid.uuid4(), supabase_uid=f"seed:{slug}", email=f"{slug}@example.com", name=name
    )


def _member(user: User, flat: Flat | None, society: Society, role: MembershipRole) -> Membership:
    return Membership(
        id=uuid.uuid4(),
        user_id=user.id,
        society_id=society.id,
        flat_id=flat.id if flat else None,
        role=role,
        status=MembershipStatus.approved,
    )


@pytest.fixture
async def world(db_session) -> World:
    society = Society(
        id=uuid.uuid4(), name="Prestige Meridian Park", city="Gurugram", invite_code="HD0001"
    )
    other = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="HD0002")
    tower_b = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower B")
    tower_c = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    other_tower = Tower(id=uuid.uuid4(), society_id=other.id, name="Tower A")
    flat_b = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_b.id, flat_no="501")
    flat_c = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_c.id, flat_no="702")
    other_flat = Flat(id=uuid.uuid4(), society_id=other.id, tower_id=other_tower.id, flat_no="1")
    vendor = Vendor(
        id=uuid.uuid4(),
        society_id=society.id,
        name="AquaCare Plumbing",
        category=VendorCategory.plumbing,
        emoji="🔧",
    )
    other_vendor = Vendor(
        id=uuid.uuid4(),
        society_id=other.id,
        name="Elsewhere Fix",
        category=VendorCategory.other,
        emoji="🛠️",
    )
    nikhil, meera, committee, outsider, outside_committee = (
        _user("Nikhil Bansal"),
        _user("Meera Kapoor"),
        _user("Meera Sharma"),
        _user("Out Sider"),
        _user("Other Committee"),
    )
    db_session.add_all([society, other, nikhil, meera, committee, outsider, outside_committee])
    await db_session.flush()
    db_session.add_all([tower_b, tower_c, other_tower, vendor, other_vendor])
    await db_session.flush()
    db_session.add_all([flat_b, flat_c, other_flat])
    await db_session.flush()
    db_session.add_all(
        [
            _member(nikhil, flat_c, society, MembershipRole.owner),
            _member(meera, flat_b, society, MembershipRole.tenant),
            _member(committee, None, society, MembershipRole.committee),
            _member(outsider, other_flat, other, MembershipRole.owner),
            _member(outside_committee, None, other, MembershipRole.committee),
        ]
    )
    await db_session.commit()
    return World(
        society,
        tower_b,
        tower_c,
        other_tower,
        vendor,
        other_vendor,
        nikhil,
        meera,
        committee,
        outsider,
        outside_committee,
    )


@pytest.fixture
def act_as() -> Iterator[Any]:
    def switch(user: User) -> None:
        async def override() -> User:
            return user

        app.dependency_overrides[get_current_user] = override

    yield switch
    app.dependency_overrides.pop(get_current_user, None)


def lift_issue(world: World, **extra: Any) -> dict[str, Any]:
    return {
        "category": "lift",
        "scope": "common_area",
        "towerId": str(world.tower_b.id),
        "areaLabel": "Lift 2",
        "title": "Lift 2 stops at 5th floor",
        "description": "It jerks at the 5th floor landing.",
        "urgency": "urgent",
        **extra,
    }


def flat_issue(**extra: Any) -> dict[str, Any]:
    return {
        "category": "electricity",
        "scope": "my_flat",
        "title": "Bedroom AC not cooling",
        "description": "Blows air but does not cool.",
        **extra,
    }


async def create(client: AsyncClient, body: dict[str, Any]) -> dict[str, Any]:
    response = await client.post("/v1/help-desk/issues", json=body)
    assert response.status_code == 201, response.text
    return response.json()


# --- issues --------------------------------------------------------------------------------


async def test_create_common_area_issue(client, world, act_as):
    act_as(world.meera)
    issue = await create(client, lift_issue(world))

    assert issue["number"] == "HD-1001"
    assert issue["tower"] == "Tower B" and issue["status"] == "open"
    assert issue["reporterIds"] == [str(world.meera.id)]
    assert issue["followerIds"] == [str(world.meera.id)] and issue["reporterCount"] == 1
    assert issue["reporterEmails"] == []
    assert issue["timeline"][0]["kind"] == "created"
    assert issue["timeline"][0]["actorName"] == "Meera K."

    second = await create(client, lift_issue(world, title="Lobby light flickers"))
    assert second["number"] == "HD-1002"


async def test_my_flat_issue_uses_own_tower(client, world, act_as):
    act_as(world.nikhil)
    issue = await create(client, flat_issue(towerId=str(world.tower_b.id)))
    assert issue["tower"] == "Tower C" and issue["scope"] == "my_flat"


async def test_my_flat_issue_needs_a_flat(client, world, act_as):
    act_as(world.committee)
    response = await client.post("/v1/help-desk/issues", json=flat_issue())
    assert response.status_code == 422 and response.json()["code"] == "no_flat"


@pytest.mark.parametrize(
    "patch",
    [
        {"title": "x"},
        {"category": "weather"},
        {"towerId": None},
        {"description": ""},
        {"urgency": "panic"},
    ],
)
async def test_create_validation(client, world, act_as, patch):
    act_as(world.nikhil)
    response = await client.post("/v1/help-desk/issues", json=lift_issue(world, **patch))
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


async def test_create_rejects_other_societys_tower(client, world, act_as):
    act_as(world.nikhil)
    response = await client.post(
        "/v1/help-desk/issues", json=lift_issue(world, towerId=str(world.other_tower.id))
    )
    assert response.status_code == 422 and response.json()["code"] == "invalid_tower"


async def test_visibility(client, world, act_as):
    act_as(world.meera)
    lift = await create(client, lift_issue(world))
    private = await create(client, flat_issue())

    act_as(world.nikhil)  # another tower: sees the shared lift issue, not Meera's flat issue
    ids = [i["id"] for i in (await client.get("/v1/help-desk/issues")).json()]
    assert ids == [lift["id"]]
    assert (await client.get(f"/v1/help-desk/issues/{private['id']}")).status_code == 404

    act_as(world.committee)
    ids = {i["id"] for i in (await client.get("/v1/help-desk/issues")).json()}
    assert ids == {lift["id"], private["id"]}

    act_as(world.outsider)
    assert (await client.get("/v1/help-desk/issues")).json() == []
    assert (await client.get(f"/v1/help-desk/issues/{lift['id']}")).status_code == 404


async def test_issue_endpoints_require_auth(client):
    issue_id = uuid.uuid4()
    calls = [
        client.get("/v1/help-desk/issues"),
        client.post("/v1/help-desk/issues", json={}),
        client.get(f"/v1/help-desk/issues/{issue_id}"),
        client.post(f"/v1/help-desk/issues/{issue_id}/me-too"),
        client.post(f"/v1/help-desk/issues/{issue_id}/comments", json={"message": "hi"}),
        client.post(f"/v1/help-desk/issues/{issue_id}/confirmation", json={"fixed": True}),
        client.patch(f"/v1/help-desk/issues/{issue_id}/status", json={"status": "resolved"}),
        client.get("/v1/help-desk/vendors"),
        client.post("/v1/help-desk/feedback", json={}),
        client.get("/v1/help-desk/feedback"),
    ]
    for call in calls:
        assert (await call).status_code == 401


async def test_me_too_adds_reporter_once(client, world, act_as):
    act_as(world.meera)
    lift = await create(client, lift_issue(world))

    act_as(world.nikhil)
    for _ in range(2):
        response = await client.post(f"/v1/help-desk/issues/{lift['id']}/me-too")
        assert response.status_code == 200
    assert response.json()["reporterCount"] == 2
    mine = [i["id"] for i in (await client.get("/v1/help-desk/issues")).json()]
    assert lift["id"] in mine


async def test_me_too_rules(client, world, act_as):
    act_as(world.nikhil)
    own_flat = await create(client, flat_issue())
    response = await client.post(f"/v1/help-desk/issues/{own_flat['id']}/me-too")
    assert response.status_code == 422 and response.json()["code"] == "not_shared"

    act_as(world.meera)
    lift = await create(client, lift_issue(world))
    act_as(world.outsider)
    assert (await client.post(f"/v1/help-desk/issues/{lift['id']}/me-too")).status_code == 404
    act_as(world.outside_committee)
    assert (await client.get(f"/v1/help-desk/issues/{lift['id']}")).status_code == 404
    assert (await client.post("/v1/help-desk/issues/nope/me-too")).status_code == 422


async def test_comments(client, world, act_as):
    act_as(world.meera)
    lift = await create(client, lift_issue(world))
    url = f"/v1/help-desk/issues/{lift['id']}/comments"

    response = await client.post(url, json={"message": "  Still happening today. "})
    assert response.status_code == 200
    assert response.json()["timeline"][0]["message"] == "Still happening today."

    assert (await client.post(url, json={"message": ""})).status_code == 422

    act_as(world.nikhil)  # can see it, but hasn't joined it
    response = await client.post(url, json={"message": "Me as well"})
    assert response.status_code == 403

    act_as(world.committee)
    response = await client.post(url, json={"message": "Technician coming at 4 PM."})
    assert response.json()["timeline"][0]["actorName"] == "Committee"

    act_as(world.outsider)
    assert (await client.post(url, json={"message": "hi"})).status_code == 404


async def test_status_update_and_confirmation(client, world, act_as, db_session):
    act_as(world.meera)
    lift = await create(client, lift_issue(world))
    act_as(world.nikhil)
    await client.post(f"/v1/help-desk/issues/{lift['id']}/me-too")
    confirm_url = f"/v1/help-desk/issues/{lift['id']}/confirmation"

    early = await client.post(confirm_url, json={"fixed": True})
    assert early.status_code == 422 and early.json()["code"] == "not_resolved"

    act_as(world.committee)
    response = await client.patch(
        f"/v1/help-desk/issues/{lift['id']}/status",
        json={
            "status": "resolved",
            "note": "Brake pads replaced.",
            "vendorId": str(world.vendor.id),
        },
    )
    body = response.json()
    assert body["status"] == "resolved" and body["awaitingConfirmation"] is True
    assert body["assignedVendorId"] == str(world.vendor.id)
    kinds = [entry["kind"] for entry in body["timeline"]]
    assert {"vendor", "committee_note", "status"} <= set(kinds)

    notified = set(
        await db_session.scalars(
            select(Notification.user_id).where(Notification.kind == "help_desk")
        )
    )
    assert notified == {world.meera.id, world.nikhil.id}

    act_as(world.nikhil)
    response = await client.post(confirm_url, json={"fixed": False, "note": "Still jerks."})
    assert response.json()["status"] == "open"
    assert response.json()["timeline"][0]["message"] == "Reopened: Still jerks."


async def test_status_update_rules(client, world, act_as):
    act_as(world.meera)
    lift = await create(client, lift_issue(world))
    url = f"/v1/help-desk/issues/{lift['id']}/status"

    assert (await client.patch(url, json={"status": "resolved"})).status_code == 403

    act_as(world.committee)
    assert (await client.patch(url, json={"status": "done"})).status_code == 422
    response = await client.patch(
        url, json={"status": "in_progress", "vendorId": str(world.other_vendor.id)}
    )
    assert response.status_code == 422 and response.json()["code"] == "invalid_vendor"


async def test_confirmation_only_by_followers(client, world, act_as):
    act_as(world.meera)
    lift = await create(client, lift_issue(world))
    act_as(world.committee)
    await client.patch(f"/v1/help-desk/issues/{lift['id']}/status", json={"status": "resolved"})

    act_as(world.nikhil)
    response = await client.post(
        f"/v1/help-desk/issues/{lift['id']}/confirmation", json={"fixed": True}
    )
    assert response.status_code == 403
    act_as(world.meera)
    response = await client.post(
        f"/v1/help-desk/issues/{lift['id']}/confirmation", json={"fixed": True}
    )
    assert response.json()["status"] == "closed"
    assert response.json()["awaitingConfirmation"] is False


# --- vendors and feedback ------------------------------------------------------------------


async def test_towers_are_per_society(client, world, act_as):
    act_as(world.nikhil)
    towers = (await client.get("/v1/help-desk/towers")).json()
    assert [t["name"] for t in towers] == ["Tower B", "Tower C"]
    act_as(world.outsider)
    assert [t["name"] for t in (await client.get("/v1/help-desk/towers")).json()] == ["Tower A"]
    app.dependency_overrides.pop(get_current_user, None)
    assert (await client.get("/v1/help-desk/towers")).status_code == 401


async def test_vendors_are_per_society(client, world, act_as):
    act_as(world.nikhil)
    vendors = (await client.get("/v1/help-desk/vendors")).json()
    assert [v["name"] for v in vendors] == ["AquaCare Plumbing"]
    assert vendors[0]["category"] == "plumbing" and vendors[0]["societyApproved"] is True

    act_as(world.outsider)
    assert [v["name"] for v in (await client.get("/v1/help-desk/vendors")).json()] == [
        "Elsewhere Fix"
    ]


async def test_feedback(client, world, act_as, db_session):
    act_as(world.nikhil)
    named = await client.post(
        "/v1/help-desk/feedback", json={"topic": "app", "message": "Please add pool hours."}
    )
    anonymous = await client.post(
        "/v1/help-desk/feedback",
        json={"topic": "committee", "message": "Lift repairs take too long.", "anonymous": True},
    )
    assert named.status_code == anonymous.status_code == 201
    assert anonymous.json()["authorName"] is None

    stored = await db_session.get(Feedback, uuid.UUID(anonymous.json()["id"]))
    assert stored.user_id is None

    assert (await client.get("/v1/help-desk/feedback")).status_code == 403

    act_as(world.committee)
    listed = (await client.get("/v1/help-desk/feedback")).json()
    assert [f["authorName"] for f in listed] == [None, "Nikhil B."]

    act_as(world.outside_committee)
    assert (await client.get("/v1/help-desk/feedback")).json() == []


@pytest.mark.parametrize(
    "body",
    [{"topic": "app", "message": "hey"}, {"topic": "gossip", "message": "Long enough text"}, {}],
)
async def test_feedback_validation(client, world, act_as, body):
    act_as(world.nikhil)
    assert (await client.post("/v1/help-desk/feedback", json=body)).status_code == 422
