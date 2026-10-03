import uuid
from urllib.parse import parse_qs, urlparse

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models import (
    BusinessFollow,
    BusinessRecommendation,
    BusinessReviewStatus,
    LocalBusiness,
    MembershipRole,
    Notification,
    Profile,
)
from tests.business_world import World, add_business, make_user
from tests.test_me_api import _enable_local_dev_auth


def url(business, suffix: str = "") -> str:
    return f"/v1/local-businesses/{business.id}{suffix}"


async def add_profile(db_session, world: World, user, visible: bool) -> None:
    db_session.add(Profile(user_id=user.id, society_id=world.society.id, is_visible=visible))
    await db_session.flush()


async def test_engagement_endpoints_require_auth(client: AsyncClient) -> None:
    business_id = uuid.uuid4()
    base = f"/v1/local-businesses/{business_id}"
    assert (await client.post(f"{base}/follow")).status_code == 401
    assert (await client.delete(f"{base}/follow")).status_code == 401
    assert (await client.post(f"{base}/recommendation", json={})).status_code == 401
    assert (await client.delete(f"{base}/recommendation")).status_code == 401
    assert (await client.post(f"{base}/updates", json={"text": "hi"})).status_code == 401
    assert (await client.patch(f"{base}/featured", json={"featured": True})).status_code == 401
    assert (await client.post(f"{base}/contact")).status_code == 401
    assert (await client.get("/v1/local-businesses/pending")).status_code == 401
    assert (await client.post(f"{base}/review", json={"decision": "approve"})).status_code == 401
    assert (await client.post(f"{base}/remove", json={"reason": "spam"})).status_code == 401
    assert (await client.get("/v1/notifications")).status_code == 401
    assert (await client.post("/v1/notifications/read-all")).status_code == 401


async def test_follow_and_unfollow_toggle_viewer_state(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    first = await client.post(url(business, "/follow"))
    assert first.status_code == 200
    assert first.json()["viewer"]["following"] is True
    assert first.json()["followerCount"] is None  # only owner and committee see counts
    again = await client.post(url(business, "/follow"))
    assert again.status_code == 200
    rows = (await db_session.execute(select(BusinessFollow))).scalars().all()
    assert len(rows) == 1
    gone = await client.delete(url(business, "/follow"))
    assert gone.json()["viewer"]["following"] is False


async def test_follow_unapproved_or_foreign_business_is_refused(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    pending = add_business(
        db_session, world, owner_id=world.member.id, review_status=BusinessReviewStatus.pending
    )
    foreign = add_business(
        db_session, world, society_id=world.other_society.id, owner_id=world.outsider.id
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.post(url(pending, "/follow"))).status_code == 409
    assert (await client.post(url(foreign, "/follow"))).status_code == 404
    assert (await client.post(url(foreign, "/recommendation"), json={})).status_code == 404
    assert (await client.post(url(foreign, "/contact"))).status_code == 404


async def test_recommend_once_with_note_then_withdraw(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world)
    await add_profile(db_session, world, world.member, visible=True)
    _enable_local_dev_auth(monkeypatch)
    first = await client.post(url(business, "/recommendation"), json={"note": "  Lovely food  "})
    assert first.status_code == 201
    body = first.json()
    assert body["recommendationCount"] == 1
    assert body["viewer"] == {"following": False, "recommended": True, "myNote": "Lovely food"}
    [note] = body["recommendations"]
    assert (note["firstName"], note["tower"], note["note"]) == ("Nikhil", "Tower B", "Lovely food")
    again = await client.post(url(business, "/recommendation"), json={})
    assert (again.status_code, again.json()["code"]) == (409, "already_recommended")
    withdrawn = await client.delete(url(business, "/recommendation"))
    assert withdrawn.status_code == 200
    assert withdrawn.json()["recommendationCount"] == 0
    assert withdrawn.json()["viewer"]["recommended"] is False
    assert (await client.post(url(business, "/recommendation"), json={})).status_code == 201


async def test_recommendation_validation_and_owner_rule(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    other = add_business(db_session, world)
    own = add_business(db_session, world, owner_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    too_long = await client.post(url(other, "/recommendation"), json={"note": "x" * 141})
    assert too_long.status_code == 422
    assert too_long.json()["code"] == "validation_error"
    exactly = await client.post(url(other, "/recommendation"), json={"note": "x" * 140})
    assert exactly.status_code == 201
    mine = await client.post(url(own, "/recommendation"), json={})
    assert (mine.status_code, mine.json()["code"]) == (403, "own_business")


async def test_notes_only_from_visible_profiles_and_latest_three(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world)
    await db_session.flush()
    for index in range(5):
        user = make_user(f"n{index}@aangan.app", f"Neighbour{index} Kumar")
        db_session.add(user)
        await db_session.flush()
        await add_profile(db_session, world, user, visible=index != 4)
        db_session.add(
            BusinessRecommendation(
                id=uuid.uuid4(),
                business_id=business.id,
                society_id=world.society.id,
                user_id=user.id,
                note=f"note {index}",
            )
        )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = (await client.get(url(business))).json()
    assert body["recommendationCount"] == 5  # hidden profiles still count
    assert len(body["recommendations"]) == 3
    assert "Neighbour4" not in str(body["recommendations"])


async def test_owner_posts_update_and_followers_are_notified(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world, owner_id=world.member.id)
    follower = make_user("fan@aangan.app", "Fan Sharma")
    db_session.add(follower)
    await db_session.flush()
    db_session.add_all(
        BusinessFollow(
            id=uuid.uuid4(),
            business_id=business.id,
            society_id=world.society.id,
            user_id=user_id,
        )
        for user_id in (follower.id, world.member.id)  # the owner following is skipped
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    long = await client.post(url(business, "/updates"), json={"text": "x" * 281})
    assert long.status_code == 422
    empty = await client.post(url(business, "/updates"), json={"text": "  "})
    assert empty.status_code == 422
    posted = await client.post(url(business, "/updates"), json={"text": "New Class 9 batch"})
    assert posted.status_code == 201
    body = posted.json()
    assert body["latestUpdate"]["text"] == "New Class 9 batch"
    assert body["followerCount"] == 2
    [item] = (await db_session.execute(select(Notification))).scalars().all()
    assert item.user_id == follower.id
    assert (item.kind, item.title, item.body) == (
        "business_update",
        "Amma's Tiffin",
        "New Class 9 batch",
    )
    assert item.href == f"/local-businesses/{business.id}"
    assert item.read_at is None


async def test_only_the_owner_can_post_updates(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    denied = await client.post(url(business, "/updates"), json={"text": "New batch"})
    assert (denied.status_code, denied.json()["code"]) == (403, "forbidden")


async def test_follower_sees_update_in_notifications(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_session.add(
        Notification(
            id=uuid.uuid4(),
            society_id=world.society.id,
            user_id=world.member.id,
            kind="business_update",
            title="Focus Maths",
            body="New Class 9 batch from Monday",
        )
    )
    db_session.add(
        Notification(
            id=uuid.uuid4(),
            society_id=world.other_society.id,
            user_id=world.outsider.id,
            kind="business_update",
            title="Elsewhere",
            body="not mine",
        )
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    me = await client.get("/v1/me")
    assert me.json()["hasUnreadNotifications"] is True
    listed = (await client.get("/v1/notifications")).json()
    assert [(n["title"], n["read"]) for n in listed] == [("Focus Maths", False)]
    assert (await client.post("/v1/notifications/read-all")).status_code == 204
    after = (await client.get("/v1/notifications")).json()
    assert after[0]["read"] is True
    assert (await client.get("/v1/me")).json()["hasUnreadNotifications"] is False


async def test_updates_need_an_approved_business(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    pending = add_business(
        db_session, world, owner_id=world.member.id, review_status=BusinessReviewStatus.pending
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(url(pending, "/updates"), json={"text": "Hello"})
    assert (response.status_code, response.json()["code"]) == (409, "not_approved")


async def test_featured_toggle_and_limit_of_four(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    for index in range(4):
        add_business(db_session, world, name=f"Featured {index}", is_featured=True)
    mine = add_business(db_session, world, owner_id=world.member.id)
    other = add_business(db_session, world, owner_id=world.owner.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    full = await client.patch(url(mine, "/featured"), json={"featured": True})
    assert (full.status_code, full.json()["code"]) == (409, "featured_limit")
    not_owner = await client.patch(url(other, "/featured"), json={"featured": True})
    assert not_owner.status_code == 403
    freed = (
        await db_session.execute(select(LocalBusiness).where(LocalBusiness.name == "Featured 0"))
    ).scalar_one()
    freed.is_featured = False
    await db_session.flush()
    ok = await client.patch(url(mine, "/featured"), json={"featured": True})
    assert ok.status_code == 200
    assert ok.json()["isFeatured"] is True
    off = await client.patch(url(mine, "/featured"), json={"featured": False})
    assert off.json()["isFeatured"] is False


async def test_contact_link_is_prefilled_and_number_stays_server_side(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world)
    calls = add_business(db_session, world, name="Call me", contact_method="call")
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(url(business, "/contact"))
    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "whatsapp"
    parsed = urlparse(body["url"])
    assert (parsed.netloc, parsed.path) == ("wa.me", "/919900011122")
    assert parse_qs(parsed.query)["text"] == [
        "Hi Lakshmi, I'm Nikhil from Tower B. I found Amma's Tiffin on Living+ "
        "and wanted to ask about…"
    ]
    detail = await client.get(url(business))
    assert "9900011122" not in detail.text
    call = await client.post(url(calls, "/contact"))
    assert call.json() == {"method": "call", "url": "tel:+919900011122"}


async def test_contact_edge_cases(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    own = add_business(db_session, world, owner_id=world.member.id)
    no_phone_owner = make_user("nophone@aangan.app", "No Phone")
    db_session.add(no_phone_owner)
    await db_session.flush()
    unreachable = add_business(db_session, world, owner_id=no_phone_owner.id)
    pending = add_business(db_session, world, review_status=BusinessReviewStatus.pending)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.post(url(own, "/contact"))).status_code == 422
    assert (await client.post(url(unreachable, "/contact"))).json()["code"] == "owner_unreachable"
    assert (await client.post(url(pending, "/contact"))).status_code == 404


async def _make_committee(db_session, world: World) -> None:
    world.membership.role = MembershipRole.committee
    await db_session.flush()


async def test_committee_approves_and_owner_is_notified(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    pending = add_business(db_session, world, review_status=BusinessReviewStatus.pending)
    await _make_committee(db_session, world)
    _enable_local_dev_auth(monkeypatch)
    queue = await client.get("/v1/local-businesses/pending")
    assert [card["id"] for card in queue.json()] == [str(pending.id)]
    detail = (await client.get(url(pending))).json()
    assert detail["canReview"] is True
    approved = await client.post(url(pending, "/review"), json={"decision": "approve"})
    assert approved.status_code == 200
    assert approved.json()["reviewStatus"] == "approved"
    assert (await client.get("/v1/local-businesses/pending")).json() == []
    assert len((await client.get("/v1/local-businesses")).json()) == 1
    [note] = (await db_session.execute(select(Notification))).scalars().all()
    assert note.user_id == world.owner.id
    again = await client.post(url(pending, "/review"), json={"decision": "approve"})
    assert (again.status_code, again.json()["code"]) == (409, "not_pending")


async def test_committee_rejection_needs_reason_and_shows_to_owner(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    pending = add_business(db_session, world, review_status=BusinessReviewStatus.pending)
    await _make_committee(db_session, world)
    _enable_local_dev_auth(monkeypatch)
    missing = await client.post(url(pending, "/review"), json={"decision": "reject"})
    assert (missing.status_code, missing.json()["code"]) == (422, "validation_error")
    bad = await client.post(url(pending, "/review"), json={"decision": "maybe"})
    assert bad.status_code == 422
    rejected = await client.post(
        url(pending, "/review"), json={"decision": "reject", "reason": "Add a clearer cover photo"}
    )
    assert rejected.status_code == 200
    assert rejected.json()["reviewStatus"] == "rejected"
    assert rejected.json()["rejectionReason"] == "Add a clearer cover photo"
    assert (await client.get("/v1/local-businesses")).json() == []


async def test_committee_removes_business_and_note_with_reason(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    business = add_business(db_session, world, is_featured=True)
    other_user = make_user("rec@aangan.app", "Rec Ommender")
    db_session.add(other_user)
    await db_session.flush()
    await add_profile(db_session, world, other_user, visible=True)
    rec = BusinessRecommendation(
        id=uuid.uuid4(),
        business_id=business.id,
        society_id=world.society.id,
        user_id=other_user.id,
        note="rude note",
    )
    db_session.add(rec)
    await _make_committee(db_session, world)
    _enable_local_dev_auth(monkeypatch)
    before = (await client.get(url(business))).json()
    assert before["followerCount"] == 0
    assert [r["id"] for r in before["recommendations"]] == [str(rec.id)]
    note_path = url(business, f"/recommendations/{rec.id}/remove-note")
    assert (await client.post(note_path, json={})).status_code == 422
    taken = await client.post(note_path, json={"reason": "Not respectful"})
    assert taken.status_code == 200
    assert taken.json()["recommendations"] == []
    assert taken.json()["recommendationCount"] == 1
    removed = await client.post(
        url(business, "/remove"), json={"reason": "Not a resident business"}
    )
    assert removed.status_code == 204
    assert (await client.get(url(business))).status_code == 404
    assert (await client.get("/v1/local-businesses")).json() == []


async def test_committee_actions_are_forbidden_for_residents_and_other_societies(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    mine = add_business(db_session, world, review_status=BusinessReviewStatus.pending)
    foreign = add_business(
        db_session,
        world,
        society_id=world.other_society.id,
        owner_id=world.outsider.id,
        review_status=BusinessReviewStatus.pending,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.get("/v1/local-businesses/pending")).status_code == 403
    approve = {"decision": "approve"}
    assert (await client.post(url(mine, "/review"), json=approve)).status_code == 403
    assert (await client.post(url(mine, "/remove"), json={"reason": "spam"})).status_code == 403
    await _make_committee(db_session, world)
    assert (await client.post(url(foreign, "/review"), json=approve)).status_code == 404
    assert (await client.post(url(foreign, "/remove"), json={"reason": "spam"})).status_code == 404
    path = url(foreign, f"/recommendations/{uuid.uuid4()}/remove-note")
    assert (await client.post(path, json={"reason": "spam"})).status_code == 404
