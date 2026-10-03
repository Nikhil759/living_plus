import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, unquote, urlparse

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models import (
    ListingContactMethod,
    MembershipRole,
    Notification,
    OpeningKind,
    OpeningStatus,
)
from tests.business_world import World
from tests.opening_world import add_opening, tower_named
from tests.test_me_api import _enable_local_dev_auth


def path(opening, suffix: str = "") -> str:
    return f"/v1/flat-openings/{opening.id}{suffix}"


async def test_action_endpoints_require_auth(client: AsyncClient) -> None:
    base = f"/v1/flat-openings/{uuid.uuid4()}"
    assert (await client.post(f"{base}/fill")).status_code == 401
    assert (await client.post(f"{base}/renew")).status_code == 401
    assert (await client.post(f"{base}/remove", json={})).status_code == 401
    assert (await client.post(f"{base}/contact")).status_code == 401


async def test_contact_link_is_prefilled_and_number_stays_server_side(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    tower_b = await tower_named(db_session, world.society.id, "Tower B")
    opening = await add_opening(
        db_session, world, kind=OpeningKind.flatmate_needed, bhk=2, tower_id=tower_b.id
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(path(opening, "/contact"))
    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "whatsapp"
    parsed = urlparse(body["url"])
    assert parsed.netloc == "wa.me" and parsed.path == "/919900011122"
    assert parse_qs(parsed.query)["text"] == [
        "Hi Lakshmi, I'm Nikhil from Tower B. "
        "Is the Flatmate for 2 BHK · Tower B on Living+ still available?"
    ]
    # The number is only in the link; the opening itself never carries it.
    assert "9900011122" not in (await client.get(path(opening))).text
    assert "%C2%B7" in body["url"] and "·" not in unquote(body["url"]).split("?")[0]


async def test_contact_by_call_returns_a_tel_link(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    opening = await add_opening(db_session, world, contact_method=ListingContactMethod.call)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = (await client.post(path(opening, "/contact"))).json()
    assert body == {"method": "call", "url": "tel:+919900011122"}


async def test_contact_edge_cases(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    mine = await add_opening(db_session, world, poster_id=world.member.id)
    filled = await add_opening(db_session, world, status=OpeningStatus.filled)
    expired = await add_opening(db_session, world, expires_at=datetime.now(UTC) - timedelta(days=1))
    world.owner.phone = None
    unreachable = await add_opening(db_session, world)
    far_tower = await tower_named(db_session, world.other_society.id, "Tower Z")
    foreign = await add_opening(
        db_session,
        world,
        society_id=world.other_society.id,
        poster_id=world.outsider.id,
        tower_id=far_tower.id,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.post(path(mine, "/contact"))).json()["code"] == "own_opening"
    assert (await client.post(path(filled, "/contact"))).json()["code"] == "opening_closed"
    assert (await client.post(path(expired, "/contact"))).json()["code"] == "opening_closed"
    assert (await client.post(path(unreachable, "/contact"))).json()["code"] == "poster_unreachable"
    assert (await client.post(path(foreign, "/contact"))).status_code == 404


async def test_mark_filled_removes_it_from_the_list(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    opening = await add_opening(db_session, world, poster_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert len((await client.get("/v1/flat-openings")).json()) == 1
    response = await client.post(path(opening, "/fill"))
    assert (response.status_code, response.json()["state"]) == (200, "filled")
    assert (await client.get("/v1/flat-openings")).json() == []


async def test_only_the_poster_can_fill_or_renew(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    theirs = await add_opening(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.post(path(theirs, "/fill"))).json()["code"] == "forbidden"
    assert (await client.post(path(theirs, "/renew"))).json()["code"] == "forbidden"
    await db_session.refresh(theirs)
    assert theirs.status == OpeningStatus.active
    assert (await client.post(f"/v1/flat-openings/{uuid.uuid4()}/fill")).status_code == 404


async def test_renew_extends_30_days_and_revives_an_expired_listing(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    soon = await add_opening(
        db_session,
        world,
        poster_id=world.member.id,
        expires_at=datetime.now(UTC) + timedelta(days=2),
    )
    lapsed = await add_opening(
        db_session,
        world,
        poster_id=world.member.id,
        expires_at=datetime.now(UTC) - timedelta(days=1),
    )
    fresh = await add_opening(db_session, world, poster_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    before = (await client.get(path(soon))).json()
    assert (before["canRenew"], before["state"]) == (True, "active")
    assert (await client.get(path(fresh))).json()["canRenew"] is False
    lapsed_view = (await client.get(path(lapsed))).json()
    assert (lapsed_view["state"], lapsed_view["canRenew"]) == ("expired", True)
    assert (await client.get("/v1/flat-openings")).json().__len__() == 2

    for opening in (soon, lapsed):
        response = await client.post(path(opening, "/renew"))
        assert response.status_code == 200
        body = response.json()
        assert (body["state"], body["canRenew"]) == ("active", False)
        left = datetime.fromisoformat(body["expiresAt"]) - datetime.now(UTC)
        assert timedelta(days=29, hours=23) < left < timedelta(days=30, hours=1)
    assert len((await client.get("/v1/flat-openings")).json()) == 3


async def test_expired_listing_is_offered_renewal_to_its_poster_only(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    lapsed = await add_opening(db_session, world, expires_at=datetime.now(UTC) - timedelta(days=1))
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    other_view = (await client.get(path(lapsed))).json()
    assert (other_view["state"], other_view["canRenew"], other_view["expiresAt"]) == (
        "expired",
        False,
        None,
    )


async def test_filled_listing_cannot_be_renewed(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    filled = await add_opening(
        db_session, world, poster_id=world.member.id, status=OpeningStatus.filled
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(path(filled, "/renew"))
    assert (response.status_code, response.json()["code"]) == (409, "opening_closed")


async def test_poster_deletes_without_a_reason(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    opening = await add_opening(db_session, world, poster_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.post(path(opening, "/remove"), json={})).status_code == 204
    assert (await client.get(path(opening))).status_code == 404
    assert (await client.get("/v1/flat-openings")).json() == []


async def test_committee_removes_any_listing_with_a_reason(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    opening = await add_opening(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    world.membership.role = MembershipRole.committee
    await db_session.flush()
    assert (await client.get(path(opening))).json()["canRemove"] is True
    needs = await client.post(path(opening, "/remove"), json={})
    assert (needs.status_code, needs.json()["code"]) == (422, "reason_required")
    done = await client.post(path(opening, "/remove"), json={"reason": "Not a real listing"})
    assert done.status_code == 204
    await db_session.refresh(opening)
    assert opening.status == OpeningStatus.removed
    assert opening.removed_reason == "Not a real listing"
    assert opening.removed_by_id == world.member.id
    assert (await client.get("/v1/flat-openings")).json() == []


async def test_residents_cannot_remove_other_peoples_listings(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    opening = await add_opening(db_session, world)
    far_tower = await tower_named(db_session, world.other_society.id, "Tower Z")
    foreign = await add_opening(
        db_session,
        world,
        society_id=world.other_society.id,
        poster_id=world.outsider.id,
        tower_id=far_tower.id,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = {"reason": "I don't like it"}
    assert (await client.post(path(opening, "/remove"), json=body)).json()["code"] == "forbidden"
    assert (await client.post(path(foreign, "/remove"), json=body)).status_code == 404
    world.membership.role = MembershipRole.committee
    await db_session.flush()
    assert (await client.post(path(foreign, "/remove"), json=body)).status_code == 404
    short = await client.post(path(opening, "/remove"), json={"reason": "x"})
    assert short.status_code == 422


async def test_reminder_comes_three_days_before_expiry_once(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    due = await add_opening(
        db_session,
        world,
        poster_id=world.member.id,
        expires_at=datetime.now(UTC) + timedelta(days=2, hours=12),
    )
    await add_opening(db_session, world, poster_id=world.member.id)  # 28 days left
    await add_opening(
        db_session,
        world,
        poster_id=world.owner.id,  # someone else's, also expiring soon
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)

    inbox = (await client.get("/v1/notifications")).json()
    [reminder] = [item for item in inbox if item["kind"] == "opening_expiring"]
    assert reminder["title"] == "Is your opening still available?"
    assert reminder["body"].startswith("Room in 1 BHK · Tower A ends in 3 days")
    assert reminder["href"] == f"/flat-openings/{due.id}"

    again = (await client.get("/v1/notifications")).json()
    assert len([i for i in again if i["kind"] == "opening_expiring"]) == 1

    await client.post(path(due, "/renew"))
    assert (await client.get(path(due))).json()["canRenew"] is False
    rows = (await db_session.execute(select(Notification))).scalars().all()
    assert [n.user_id for n in rows] == [world.member.id]


async def test_reminder_is_not_sent_for_filled_or_expired_listings(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    soon = datetime.now(UTC) + timedelta(days=2)
    await add_opening(
        db_session, world, poster_id=world.member.id, expires_at=soon, status=OpeningStatus.filled
    )
    await add_opening(
        db_session,
        world,
        poster_id=world.member.id,
        expires_at=datetime.now(UTC) - timedelta(hours=1),
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.get("/v1/notifications")).json() == []
