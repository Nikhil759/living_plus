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
    Flat,
    Group,
    GroupMember,
    Membership,
    MembershipRole,
    MembershipStatus,
    Notification,
    Post,
    Profile,
    Society,
    Tower,
    User,
    WhatsappGroup,
)
from app.models.enums import GroupMemberRole, PostType


@dataclass
class World:
    society: Society
    nikhil: User  # owner, Tower C, likes football
    meera: User  # tenant, Tower B, visible profile, shows flat
    rohan: User  # hidden profile
    committee: User
    outsider: User  # another society
    fifa: Group  # public, Meera is admin
    book_club: Group  # private, Meera is admin
    whatsapp: WhatsappGroup  # committee is admin
    other_group: Group  # another society


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
        id=uuid.uuid4(), name="Prestige Meridian Park", city="Gurugram", invite_code="CM0001"
    )
    other = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="CM0002")
    nikhil, meera, rohan, committee, outsider = (
        _user("Nikhil Bansal"),
        _user("Meera Kapoor"),
        _user("Rohan Sharma"),
        _user("Meera Sharma"),
        _user("Out Sider"),
    )
    db_session.add_all([society, other, nikhil, meera, rohan, committee, outsider])
    await db_session.flush()
    tower_b = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower B")
    tower_c = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    other_tower = Tower(id=uuid.uuid4(), society_id=other.id, name="Tower A")
    db_session.add_all([tower_b, tower_c, other_tower])
    await db_session.flush()
    flat_b = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_b.id, flat_no="501")
    flat_c = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_c.id, flat_no="702")
    other_flat = Flat(id=uuid.uuid4(), society_id=other.id, tower_id=other_tower.id, flat_no="1")
    db_session.add_all([flat_b, flat_c, other_flat])
    await db_session.flush()
    db_session.add_all(
        [
            _member(nikhil, flat_c, society, MembershipRole.owner),
            _member(meera, flat_b, society, MembershipRole.tenant),
            _member(rohan, flat_b, society, MembershipRole.owner),
            _member(committee, None, society, MembershipRole.committee),
            _member(outsider, other_flat, other, MembershipRole.owner),
            Profile(
                user_id=nikhil.id, society_id=society.id, interests=["football"], is_visible=True
            ),
            Profile(
                user_id=meera.id,
                society_id=society.id,
                interests=["dance"],
                is_visible=True,
                show_flat=True,
            ),
            Profile(
                user_id=rohan.id, society_id=society.id, interests=["football"], is_visible=False
            ),
        ]
    )
    fifa = Group(
        id=uuid.uuid4(),
        society_id=society.id,
        name="FIFA & Game Night",
        emoji="🎮",
        description="Weekend games",
        created_by=meera.id,
        tags=["FIFA", "Football"],
    )
    book_club = Group(
        id=uuid.uuid4(),
        society_id=society.id,
        name="Book Club",
        emoji="📚",
        description="Reading circle",
        created_by=meera.id,
        is_private=True,
    )
    other_group = Group(
        id=uuid.uuid4(), society_id=other.id, name="Elsewhere Club", created_by=outsider.id
    )
    whatsapp = WhatsappGroup(
        id=uuid.uuid4(),
        society_id=society.id,
        name="Tower C Updates",
        member_count=142,
        invite_link="https://chat.whatsapp.com/x",
        admin_user_id=committee.id,
    )
    db_session.add_all([fifa, book_club, other_group, whatsapp])
    await db_session.flush()
    db_session.add_all(
        [
            GroupMember(
                society_id=society.id,
                group_id=fifa.id,
                user_id=meera.id,
                role=GroupMemberRole.admin,
            ),
            GroupMember(
                society_id=society.id,
                group_id=book_club.id,
                user_id=meera.id,
                role=GroupMemberRole.admin,
            ),
            GroupMember(
                society_id=other.id,
                group_id=other_group.id,
                user_id=outsider.id,
                role=GroupMemberRole.admin,
            ),
        ]
    )
    await db_session.commit()
    return World(
        society, nikhil, meera, rohan, committee, outsider, fifa, book_club, whatsapp, other_group
    )


@pytest.fixture
def act_as() -> Iterator[Any]:
    def switch(user: User) -> None:
        async def override() -> User:
            return user

        app.dependency_overrides[get_current_user] = override

    yield switch
    app.dependency_overrides.pop(get_current_user, None)


async def post(client: AsyncClient, body: dict[str, Any], status: int = 201) -> dict[str, Any]:
    response = await client.post("/v1/community/posts", json=body)
    assert response.status_code == status, response.text
    return response.json()


# --- catalog --------------------------------------------------------------------------------


async def test_catalog(client, world, act_as):
    act_as(world.nikhil)
    catalog = (await client.get("/v1/community/catalog")).json()

    groups = {g["name"]: g for g in catalog["groups"]}
    assert set(groups) == {"FIFA & Game Night", "Book Club"}
    fifa = groups["FIFA & Game Night"]
    assert fifa["memberCount"] == 1 and fifa["joined"] is False
    assert fifa["suggested"] is True  # matches Nikhil's football interest
    assert groups["Book Club"]["visibility"] == "private"

    [chat] = catalog["whatsappGroups"]
    assert chat["inviteLink"] is None and chat["pendingApproval"] is False

    # Only visible profiles, never flats, never the viewer.
    assert catalog["neighbours"] == [
        {
            "id": str(world.meera.id),
            "firstName": "Meera",
            "tower": "Tower B",
            "interests": ["dance"],
            "avatarUrl": None,
        }
    ]


async def test_catalog_is_per_society(client, world, act_as):
    act_as(world.outsider)
    catalog = (await client.get("/v1/community/catalog")).json()
    assert [g["name"] for g in catalog["groups"]] == ["Elsewhere Club"]
    assert catalog["whatsappGroups"] == [] and catalog["neighbours"] == []


async def test_endpoints_require_auth(client):
    some_id = uuid.uuid4()
    calls = [
        client.get("/v1/community/catalog"),
        client.get("/v1/community/feed"),
        client.post("/v1/community/posts", json={}),
        client.post("/v1/community/groups", json={}),
        client.get(f"/v1/community/groups/{some_id}"),
        client.post(f"/v1/community/groups/{some_id}/join"),
        client.delete(f"/v1/community/groups/{some_id}/membership"),
        client.post(f"/v1/community/whatsapp/{some_id}/request"),
        client.get("/v1/community/join-requests"),
        client.post(f"/v1/community/join-requests/{some_id}/approve"),
        client.post(f"/v1/community/join-requests/{some_id}/reject"),
    ]
    for call in calls:
        assert (await call).status_code == 401


# --- posts and feed -------------------------------------------------------------------------


async def test_society_post_and_feed(client, world, act_as):
    act_as(world.meera)
    created = await post(
        client, {"body": "  Any good tailor near Gate 2? ", "postType": "question"}
    )
    assert created["body"] == "Any good tailor near Gate 2?"
    assert created["authorName"] == "Meera K."
    assert created["authorMeta"] == "Tower B · 501"  # Meera chose to show her flat
    assert created["postType"] == "question" and created["pinned"] is False

    act_as(world.nikhil)
    created_by_nikhil = await post(client, {"body": "Lost keys near the pool."})
    assert created_by_nikhil["authorMeta"] == "Tower C"  # flat hidden by default

    feed = (await client.get("/v1/community/feed")).json()
    assert [p["id"] for p in feed] == [created_by_nikhil["id"], created["id"]]

    act_as(world.outsider)
    assert (await client.get("/v1/community/feed")).json() == []


async def test_private_group_posts_stay_in_the_group(client, world, act_as):
    act_as(world.meera)
    secret = await post(
        client, {"body": "Next book: Malgudi Days", "groupId": str(world.book_club.id)}
    )
    public = await post(client, {"body": "FIFA at 9 tonight", "groupId": str(world.fifa.id)})

    act_as(world.nikhil)
    ids = [p["id"] for p in (await client.get("/v1/community/feed")).json()]
    assert public["id"] in ids and secret["id"] not in ids
    response = await client.get("/v1/community/feed", params={"groupId": str(world.book_club.id)})
    assert response.status_code == 403
    detail = (await client.get(f"/v1/community/groups/{world.book_club.id}")).json()
    assert detail["posts"] == []

    fifa_feed = await client.get("/v1/community/feed", params={"groupId": str(world.fifa.id)})
    assert [p["groupName"] for p in fifa_feed.json()] == ["FIFA & Game Night"]


async def test_post_rules(client, world, act_as):
    act_as(world.nikhil)
    response = await client.post(
        "/v1/community/posts", json={"body": "hello", "groupId": str(world.fifa.id)}
    )
    assert response.status_code == 403  # not a member yet
    response = await client.post("/v1/community/posts", json={"body": "hi", "postType": "notice"})
    assert response.status_code == 403
    response = await client.post(
        "/v1/community/posts", json={"body": "hello", "groupId": str(world.other_group.id)}
    )
    assert response.status_code == 404

    act_as(world.committee)
    notice = await post(client, {"body": "**Fire drill:** Sat 17 Oct.", "postType": "notice"})
    assert notice["pinned"] is True and notice["authorName"] == "Committee"


async def test_notices_feed_the_home_digest(client, world, act_as, db_session):
    act_as(world.meera)
    await post(client, {"body": "**Selling:** a cycle, DM me"})
    act_as(world.committee)
    await post(client, {"body": "**Fire drill:** Sat 17 Oct at 11 AM.", "postType": "notice"})

    rows = await db_session.scalars(select(Post).where(Post.post_type == PostType.notice))
    assert [p.body for p in rows] == ["**Fire drill:** Sat 17 Oct at 11 AM."]
    act_as(world.nikhil)
    announcements = (await client.get("/v1/announcements")).json()
    assert [a["lead"] for a in announcements] == ["Fire drill:"]


@pytest.mark.parametrize(
    "body",
    [{"body": "x"}, {"body": "hello", "postType": "rumour"}, {"body": "y" * 1001}, {}],
)
async def test_post_validation(client, world, act_as, body):
    act_as(world.nikhil)
    assert (await client.post("/v1/community/posts", json=body)).status_code == 422


# --- groups ----------------------------------------------------------------------------------


async def test_create_group(client, world, act_as):
    act_as(world.nikhil)
    response = await client.post(
        "/v1/community/groups",
        json={
            "name": "Sunday Cyclists",
            "emoji": "🚴",
            "description": "Easy 20 km rides",
            "tags": ["cycling"],
        },
    )
    assert response.status_code == 201
    group = response.json()
    assert group["joined"] and group["isAdmin"] and group["memberCount"] == 1

    duplicate = await client.post(
        "/v1/community/groups", json={"name": "sunday cyclists", "description": "Again"}
    )
    assert duplicate.status_code == 409

    act_as(world.outsider)  # same name is fine in another society
    response = await client.post(
        "/v1/community/groups", json={"name": "Sunday Cyclists", "description": "Ours"}
    )
    assert response.status_code == 201


@pytest.mark.parametrize(
    "body",
    [
        {"name": "ab", "description": "Fine"},
        {"name": "Okay name"},
        {"name": "Okay name", "description": "Fine", "visibility": "secret"},
    ],
)
async def test_create_group_validation(client, world, act_as, body):
    act_as(world.nikhil)
    assert (await client.post("/v1/community/groups", json=body)).status_code == 422


async def test_join_and_leave_public_group(client, world, act_as):
    act_as(world.nikhil)
    joined = (await client.post(f"/v1/community/groups/{world.fifa.id}/join")).json()
    assert joined["joined"] is True and joined["memberCount"] == 2
    await post(client, {"body": "Count me in!", "groupId": str(world.fifa.id)})

    left = await client.delete(f"/v1/community/groups/{world.fifa.id}/membership")
    assert left.json()["joined"] is False
    again = await client.delete(f"/v1/community/groups/{world.fifa.id}/membership")
    assert again.status_code == 422 and again.json()["code"] == "not_member"

    act_as(world.meera)  # the only admin can't leave
    response = await client.delete(f"/v1/community/groups/{world.fifa.id}/membership")
    assert response.status_code == 422 and response.json()["code"] == "last_admin"


async def test_group_from_another_society(client, world, act_as):
    act_as(world.nikhil)
    assert (await client.get(f"/v1/community/groups/{world.other_group.id}")).status_code == 404
    response = await client.post(f"/v1/community/groups/{world.other_group.id}/join")
    assert response.status_code == 404
    assert (await client.get("/v1/community/groups/not-an-id")).status_code == 422


async def test_private_group_join_request(client, world, act_as, db_session):
    act_as(world.nikhil)
    pending = (await client.post(f"/v1/community/groups/{world.book_club.id}/join")).json()
    assert pending["pending"] is True and pending["joined"] is False

    act_as(world.committee)  # not this group's admin
    assert (await client.get("/v1/community/join-requests")).json() == []

    act_as(world.meera)
    [request] = (await client.get("/v1/community/join-requests")).json()
    assert request["targetName"] == "Book Club" and request["requesterName"] == "Nikhil B."

    act_as(world.committee)
    response = await client.post(f"/v1/community/join-requests/{request['id']}/approve")
    assert response.status_code == 403

    act_as(world.meera)
    response = await client.post(f"/v1/community/join-requests/{request['id']}/approve")
    assert response.status_code == 204
    assert (
        await client.post(f"/v1/community/join-requests/{request['id']}/approve")
    ).status_code == 404

    act_as(world.nikhil)
    detail = (await client.get(f"/v1/community/groups/{world.book_club.id}")).json()
    assert detail["joined"] is True
    notes = await db_session.scalars(
        select(Notification.title).where(Notification.user_id == world.nikhil.id)
    )
    assert list(notes) == ["Book Club: request approved"]


# --- WhatsApp --------------------------------------------------------------------------------


async def test_whatsapp_request_and_approval(client, world, act_as):
    act_as(world.nikhil)
    url = f"/v1/community/whatsapp/{world.whatsapp.id}/request"
    first = (await client.post(url)).json()
    assert first["pendingApproval"] is True and first["inviteLink"] is None
    assert (await client.post(url)).json()["pendingApproval"] is True  # no duplicate request

    act_as(world.committee)
    [request] = (await client.get("/v1/community/join-requests")).json()
    assert request["targetType"] == "whatsapp"
    catalog = (await client.get("/v1/community/catalog")).json()
    assert catalog["whatsappGroups"][0]["inviteLink"] == "https://chat.whatsapp.com/x"
    assert (
        await client.post(f"/v1/community/join-requests/{request['id']}/approve")
    ).status_code == 204

    act_as(world.nikhil)
    chat = (await client.get("/v1/community/catalog")).json()["whatsappGroups"][0]
    assert chat["inviteLink"] == "https://chat.whatsapp.com/x"
    assert chat["pendingApproval"] is False


async def test_whatsapp_reject(client, world, act_as):
    act_as(world.nikhil)
    await client.post(f"/v1/community/whatsapp/{world.whatsapp.id}/request")
    act_as(world.committee)
    [request] = (await client.get("/v1/community/join-requests")).json()
    assert (
        await client.post(f"/v1/community/join-requests/{request['id']}/reject")
    ).status_code == 204

    act_as(world.nikhil)
    chat = (await client.get("/v1/community/catalog")).json()["whatsappGroups"][0]
    assert chat["inviteLink"] is None and chat["pendingApproval"] is False


async def test_whatsapp_from_another_society(client, world, act_as):
    act_as(world.outsider)
    response = await client.post(f"/v1/community/whatsapp/{world.whatsapp.id}/request")
    assert response.status_code == 404
