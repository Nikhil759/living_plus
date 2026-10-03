import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.models import (
    Flat,
    ListingCategory,
    ListingCondition,
    ListingContactMethod,
    ListingStatus,
    MarketplaceListing,
    Membership,
    MembershipRole,
    MembershipStatus,
    Society,
    Tower,
    User,
)
from tests.test_me_api import _enable_local_dev_auth
from tests.test_uploads_api import _PNG

PHONE = "+919876501234"
PHOTO = "/images/marketplace/study-desk.jpg"


@dataclass
class World:
    society: Society
    member: User
    seller: User
    membership: Membership
    other_society: Society
    outsider: User


def _user(email: str, name: str, phone: str | None = None) -> User:
    return User(id=uuid.uuid4(), supabase_uid=f"seed:{email}", email=email, name=name, phone=phone)


def _membership(society: Society, flat: Flat, user: User) -> Membership:
    return Membership(
        id=uuid.uuid4(),
        user_id=user.id,
        society_id=society.id,
        flat_id=flat.id,
        role=MembershipRole.owner,
        status=MembershipStatus.approved,
    )


@pytest.fixture
async def world(db_session) -> AsyncIterator[World]:
    society = Society(id=uuid.uuid4(), name="Test Society", city="Gurgaon", invite_code="MKT001")
    other_society = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="MKT002")
    tower_b = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower B")
    tower_a = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower A")
    far_tower = Tower(id=uuid.uuid4(), society_id=other_society.id, name="Tower Z")
    flat_b = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_b.id, flat_no="204")
    flat_a = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_a.id, flat_no="101")
    far_flat = Flat(
        id=uuid.uuid4(), society_id=other_society.id, tower_id=far_tower.id, flat_no="9"
    )
    member = _user("demo@aangan.app", "Nikhil Bansal", PHONE)
    seller = _user("rohan@aangan.app", "Rohan Mehta", "+919900011122")
    outsider = _user("far@aangan.app", "Faraway Person", "+919900099999")
    db_session.add_all(
        [
            *(society, other_society, tower_a, tower_b, far_tower),
            *(flat_a, flat_b, far_flat, member, seller, outsider),
        ]
    )
    await db_session.flush()
    membership = _membership(society, flat_b, member)
    db_session.add_all(
        [
            membership,
            _membership(society, flat_a, seller),
            _membership(other_society, far_flat, outsider),
        ]
    )
    await db_session.flush()
    yield World(society, member, seller, membership, other_society, outsider)
    get_settings.cache_clear()  # tests enable dev auth through the environment


def add_listing(db_session, world: World, **overrides) -> MarketplaceListing:
    fields = {
        "id": uuid.uuid4(),
        "society_id": world.society.id,
        "seller_id": world.seller.id,
        "title": "IKEA study desk",
        "description": "White desk with one drawer",
        "category": ListingCategory.furniture,
        "condition": ListingCondition.good,
        "price_inr": 4500,
        "photos": [PHOTO],
        "contact_method": ListingContactMethod.whatsapp,
        "status": ListingStatus.available,
        "listed_at": datetime.now(UTC),
    }
    fields.update(overrides)
    listing = MarketplaceListing(**fields)
    db_session.add(listing)
    return listing


def listing_body(**overrides) -> dict:
    body = {
        "title": "Yoga mat",
        "category": "sports",
        "condition": "like_new",
        "priceInr": 400,
        "photos": [PHOTO, "/images/marketplace/yoga-mat.jpg"],
        "contactMethod": "whatsapp",
    }
    body.update(overrides)
    return body


async def test_marketplace_requires_auth(client: AsyncClient) -> None:
    listing_id = uuid.uuid4()
    assert (await client.get("/v1/marketplace/listings")).status_code == 401
    assert (await client.get(f"/v1/marketplace/listings/{listing_id}")).status_code == 401
    assert (await client.post("/v1/marketplace/listings", json=listing_body())).status_code == 401
    assert (
        await client.put(f"/v1/marketplace/listings/{listing_id}", json=listing_body())
    ).status_code == 401
    assert (await client.get("/v1/marketplace/seller-profile")).status_code == 401


async def test_browse_shows_only_own_society_available_and_reserved(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    add_listing(db_session, world, title="Visible desk")
    add_listing(db_session, world, title="Held cycle", status=ListingStatus.reserved)
    add_listing(db_session, world, title="Sold stroller", status=ListingStatus.sold)
    add_listing(db_session, world, title="Removed lamp", status=ListingStatus.removed)
    add_listing(
        db_session,
        world,
        title="Other society sofa",
        society_id=world.other_society.id,
        seller_id=world.outsider.id,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/marketplace/listings")
    assert response.status_code == 200
    cards = {card["title"]: card for card in response.json()}
    assert set(cards) == {"Visible desk", "Held cycle"}
    desk = cards["Visible desk"]
    assert desk["tower"] == "Tower A"
    assert desk["coverUrl"] == PHOTO
    assert (desk["isFree"], desk["isMine"], desk["reported"]) == (False, False, False)
    assert cards["Held cycle"]["status"] == "reserved"


async def test_browse_filters_search_and_sort(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    base = datetime.now(UTC)
    add_listing(
        db_session,
        world,
        title="PS5 games",
        category=ListingCategory.electronics,
        price_inr=2800,
        listed_at=base - timedelta(days=3),
    )
    add_listing(
        db_session,
        world,
        title="Air fryer",
        category=ListingCategory.electronics,
        price_inr=1500,
        description="Barely used",
        listed_at=base - timedelta(days=2),
    )
    add_listing(
        db_session,
        world,
        title="Picture books",
        category=ListingCategory.books,
        price_inr=0,
        listed_at=base - timedelta(days=1),
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)

    def titles(response) -> list[str]:
        return [card["title"] for card in response.json()]

    assert titles(await client.get("/v1/marketplace/listings")) == [
        "Picture books",
        "Air fryer",
        "PS5 games",
    ]
    electronics = "/v1/marketplace/listings?category=electronics"
    assert titles(await client.get(electronics + "&sort=price_asc")) == ["Air fryer", "PS5 games"]
    assert titles(await client.get(electronics + "&sort=price_desc")) == ["PS5 games", "Air fryer"]
    free = await client.get("/v1/marketplace/listings?free=true")
    assert titles(free) == ["Picture books"]
    assert free.json()[0]["isFree"] is True
    assert titles(await client.get("/v1/marketplace/listings?q=barely")) == ["Air fryer"]
    assert titles(await client.get("/v1/marketplace/listings?q=PS5")) == ["PS5 games"]
    assert titles(await client.get("/v1/marketplace/listings?q=100%25")) == []
    bad = await client.get("/v1/marketplace/listings?sort=cheapest")
    assert bad.status_code == 422
    assert bad.json()["code"] == "validation_error"


async def test_detail_hides_seller_phone(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get(f"/v1/marketplace/listings/{listing.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["seller"] == {"firstName": "Rohan", "avatarUrl": None, "tower": "Tower A"}
    assert data["pickupNote"] == "Pickup in society"
    assert data["canManage"] is False
    assert data["contactMethod"] == "whatsapp"
    assert "9900011122" not in response.text
    assert "phone" not in response.text.lower()


async def test_detail_sold_visible_removed_and_foreign_hidden(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sold = add_listing(db_session, world, status=ListingStatus.sold)
    removed = add_listing(db_session, world, status=ListingStatus.removed)
    foreign = add_listing(
        db_session, world, society_id=world.other_society.id, seller_id=world.outsider.id
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.get(f"/v1/marketplace/listings/{sold.id}")).json()["status"] == "sold"
    for hidden in (removed, foreign, uuid.uuid4()):
        hidden_id = getattr(hidden, "id", hidden)
        response = await client.get(f"/v1/marketplace/listings/{hidden_id}")
        assert response.status_code == 404
        assert response.json()["code"] == "not_found"


async def test_create_listing_appears_first_in_browse(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    add_listing(db_session, world, listed_at=datetime.now(UTC) - timedelta(days=2))
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = listing_body(societyId=str(world.other_society.id), sellerId=str(world.seller.id))
    response = await client.post("/v1/marketplace/listings", json=body)
    assert response.status_code == 201
    data = response.json()
    assert (data["title"], data["priceInr"], data["isMine"], data["canManage"]) == (
        "Yoga mat",
        400,
        True,
        True,
    )
    assert data["tower"] == "Tower B"
    assert data["pickupNote"] == "Pickup in society"
    assert data["photos"] == body["photos"]
    created = await db_session.get(MarketplaceListing, uuid.UUID(data["id"]))
    assert created is not None
    assert (created.society_id, created.seller_id) == (world.society.id, world.member.id)
    browse = await client.get("/v1/marketplace/listings")
    assert browse.json()[0]["title"] == "Yoga mat"


async def test_create_free_listing_clears_price_and_negotiable(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/marketplace/listings",
        json=listing_body(isFree=True, priceInr=999, negotiable=True, category="books"),
    )
    assert response.status_code == 201
    data = response.json()
    assert (data["isFree"], data["priceInr"], data["negotiable"]) == (True, 0, False)


@pytest.mark.parametrize(
    "overrides",
    [
        {"photos": []},
        {"photos": [f"/images/marketplace/p{i}.jpg" for i in range(6)]},
        {"photos": ["https://example.com/a.jpg"]},
        {"photos": [PHOTO, PHOTO]},
        {"title": "x" * 61},
        {"title": "   "},
        {"priceInr": None},
        {"priceInr": 0},
        {"priceInr": -5},
        {"description": "d" * 501},
        {"category": "free"},
        {"condition": "broken"},
        {"contactMethod": "telegram"},
        {"pickupNote": ""},
        {"phone": "abc"},
    ],
)
async def test_create_listing_validation_errors(
    overrides: dict, client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/marketplace/listings", json=listing_body(**overrides))
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


async def test_create_requires_a_phone_but_never_returns_it(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    world.member.phone = None
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    profile = await client.get("/v1/marketplace/seller-profile")
    assert profile.json() == {
        "firstName": "Nikhil",
        "avatarUrl": None,
        "tower": "Tower B",
        "hasPhone": False,
    }
    missing = await client.post("/v1/marketplace/listings", json=listing_body())
    assert missing.status_code == 422
    assert missing.json()["code"] == "phone_required"

    created = await client.post("/v1/marketplace/listings", json=listing_body(phone="98765 01234"))
    assert created.status_code == 201
    assert "9876501234" not in created.text
    await db_session.refresh(world.member)
    assert world.member.phone == "9876501234"


async def test_seller_edits_own_listing(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world, seller_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.put(
        f"/v1/marketplace/listings/{listing.id}",
        json=listing_body(title="Standing desk", priceInr=5000, negotiable=True),
    )
    assert response.status_code == 200
    data = response.json()
    assert (data["title"], data["priceInr"], data["negotiable"]) == ("Standing desk", 5000, True)
    invalid = await client.put(
        f"/v1/marketplace/listings/{listing.id}", json=listing_body(photos=[])
    )
    assert invalid.status_code == 422


async def test_other_resident_cannot_edit(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.put(f"/v1/marketplace/listings/{listing.id}", json=listing_body())
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"
    await db_session.refresh(listing)
    assert listing.title == "IKEA study desk"


async def test_committee_can_edit_and_wrong_society_cannot(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    mine = add_listing(db_session, world)
    foreign = add_listing(
        db_session, world, society_id=world.other_society.id, seller_id=world.outsider.id
    )
    world.membership.role = MembershipRole.committee
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    ok = await client.put(
        f"/v1/marketplace/listings/{mine.id}", json=listing_body(title="Fixed title")
    )
    assert ok.status_code == 200
    assert ok.json()["title"] == "Fixed title"
    wrong = await client.put(f"/v1/marketplace/listings/{foreign.id}", json=listing_body())
    assert wrong.status_code == 404


async def test_listing_photo_upload_and_fetch(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    denied = await client.post(
        "/v1/uploads/listing-photos", files={"file": ("a.png", _PNG, "image/png")}
    )
    assert denied.status_code == 401
    _enable_local_dev_auth(monkeypatch)
    uploaded = await client.post(
        "/v1/uploads/listing-photos", files={"file": ("a.png", _PNG, "image/png")}
    )
    assert uploaded.status_code == 200
    url = uploaded.json()["url"]
    assert url.startswith("/v1/uploads/listing-photos/")
    fetched = await client.get(url)
    assert fetched.status_code == 200
    assert fetched.content.startswith(b"\x89PNG")
    created = await client.post("/v1/marketplace/listings", json=listing_body(photos=[url]))
    assert created.status_code == 201
    bad = await client.post(
        "/v1/uploads/listing-photos", files={"file": ("n.txt", b"hello", "text/plain")}
    )
    assert bad.status_code == 422
    assert bad.json()["code"] == "validation_error"
    assert (await client.get("/v1/uploads/listing-photos/../config.py")).status_code == 404


async def _status(client: AsyncClient, listing: MarketplaceListing, status: str):
    return await client.patch(
        f"/v1/marketplace/listings/{listing.id}/status", json={"status": status}
    )


async def test_status_flow_reserve_sell_and_relist(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    old = datetime.now(UTC) - timedelta(days=5)
    mine = add_listing(db_session, world, seller_id=world.member.id, listed_at=old)
    newer = add_listing(db_session, world, title="Other", listed_at=old + timedelta(days=1))
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)

    reserved = await _status(client, mine, "reserved")
    assert reserved.status_code == 200
    assert reserved.json()["status"] == "reserved"
    titles = [c["title"] for c in (await client.get("/v1/marketplace/listings")).json()]
    assert "IKEA study desk" in titles

    assert (await _status(client, mine, "available")).json()["status"] == "available"
    assert (await _status(client, mine, "reserved")).status_code == 200
    assert (await _status(client, mine, "sold")).json()["status"] == "sold"
    browse = [c["title"] for c in (await client.get("/v1/marketplace/listings")).json()]
    assert browse == ["Other"]
    sold_tab = await client.get("/v1/marketplace/listings/mine?tab=sold")
    assert [c["title"] for c in sold_tab.json()] == ["IKEA study desk"]
    assert (await client.get("/v1/marketplace/listings/mine")).json() == []

    relisted = await _status(client, mine, "available")
    assert relisted.json()["status"] == "available"
    browse = [c["title"] for c in (await client.get("/v1/marketplace/listings")).json()]
    assert browse[0] == "IKEA study desk"
    assert newer.title in browse


async def test_status_validation_and_invalid_transition(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sold = add_listing(db_session, world, seller_id=world.member.id, status=ListingStatus.sold)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await _status(client, sold, "reserved")).status_code == 409
    assert (await _status(client, sold, "removed")).status_code == 422
    assert (await _status(client, sold, "bogus")).status_code == 422
    assert (await _status(client, sold, "sold")).status_code == 200


async def test_status_and_remove_forbidden_for_other_resident(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    status = await _status(client, listing, "sold")
    assert (status.status_code, status.json()["code"]) == (403, "forbidden")
    removal = await client.post(f"/v1/marketplace/listings/{listing.id}/remove", json={})
    assert removal.status_code == 403
    await db_session.refresh(listing)
    assert listing.status == ListingStatus.available


async def test_status_and_remove_wrong_society_and_unauthorised(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    foreign = add_listing(
        db_session, world, society_id=world.other_society.id, seller_id=world.outsider.id
    )
    await db_session.flush()
    anon = await _status(client, foreign, "sold")
    assert anon.status_code == 401
    _enable_local_dev_auth(monkeypatch)
    world.membership.role = MembershipRole.committee
    await db_session.flush()
    assert (await _status(client, foreign, "sold")).status_code == 404
    path = f"/v1/marketplace/listings/{foreign.id}"
    assert (await client.post(f"{path}/remove", json={"reason": "spam"})).status_code == 404
    assert (await client.post(f"{path}/report", json={"reason": "spam"})).status_code == 404
    assert (await client.post(f"{path}/contact")).status_code == 404


async def test_seller_deletes_own_listing(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world, seller_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(f"/v1/marketplace/listings/{listing.id}/remove", json={})
    assert response.status_code == 204
    assert (await client.get(f"/v1/marketplace/listings/{listing.id}")).status_code == 404
    assert (await client.get("/v1/marketplace/listings")).json() == []
    assert (await client.get("/v1/marketplace/listings/mine")).json() == []


async def test_committee_removal_needs_a_reason(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world)
    world.membership.role = MembershipRole.committee
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    path = f"/v1/marketplace/listings/{listing.id}/remove"
    missing = await client.post(path, json={})
    assert (missing.status_code, missing.json()["code"]) == (422, "reason_required")
    short = await client.post(path, json={"reason": "x"})
    assert short.status_code == 422
    removed = await client.post(path, json={"reason": "Prohibited item"})
    assert removed.status_code == 204
    await db_session.refresh(listing)
    assert listing.status == ListingStatus.removed
    assert listing.removed_reason == "Prohibited item"
    assert listing.removed_by_id == world.member.id
    assert (await client.get("/v1/marketplace/listings")).json() == []


async def test_report_flags_listing_for_committee_only(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    path = f"/v1/marketplace/listings/{listing.id}/report"
    assert (await client.post(path, json={"reason": ""})).status_code == 422
    first = await client.post(path, json={"reason": "Looks like a scam"})
    assert first.status_code == 201
    assert first.json() == {"message": "Thanks, the committee will take a look"}
    again = await client.post(path, json={"reason": "Still a scam"})
    assert again.status_code == 201

    resident_view = (await client.get("/v1/marketplace/listings")).json()
    assert resident_view[0]["reported"] is False
    world.membership.role = MembershipRole.committee
    await db_session.flush()
    committee_view = (await client.get("/v1/marketplace/listings")).json()
    assert committee_view[0]["reported"] is True
    detail = await client.get(f"/v1/marketplace/listings/{listing.id}")
    assert detail.json()["reported"] is True


async def test_cannot_report_own_listing(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world, seller_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        f"/v1/marketplace/listings/{listing.id}/report", json={"reason": "just testing"}
    )
    assert (response.status_code, response.json()["code"]) == (422, "invalid_report")


async def test_contact_builds_prefilled_whatsapp_link(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    listing = add_listing(db_session, world, title="PS5 games bundle")
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(f"/v1/marketplace/listings/{listing.id}/contact")
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "whatsapp"
    assert data["url"].startswith("https://wa.me/919900011122?text=")
    assert (
        "Hi%2C%20I%27m%20Nikhil%20from%20Tower%20B.%20Is%20your%20PS5%20games%20bundle"
        in (data["url"])
    )
    detail = await client.get(f"/v1/marketplace/listings/{listing.id}")
    assert "9900011122" not in detail.text


async def test_contact_call_link_and_guards(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    call = add_listing(db_session, world, contact_method=ListingContactMethod.call)
    sold = add_listing(db_session, world, status=ListingStatus.sold)
    own = add_listing(db_session, world, seller_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(f"/v1/marketplace/listings/{call.id}/contact")
    assert response.json() == {"method": "call", "url": "tel:+919900011122"}
    gone = await client.post(f"/v1/marketplace/listings/{sold.id}/contact")
    assert (gone.status_code, gone.json()["code"]) == (409, "listing_sold")
    mine = await client.post(f"/v1/marketplace/listings/{own.id}/contact")
    assert (mine.status_code, mine.json()["code"]) == (422, "own_listing")
    world.seller.phone = None
    await db_session.flush()
    unreachable = await client.post(f"/v1/marketplace/listings/{call.id}/contact")
    assert (unreachable.status_code, unreachable.json()["code"]) == (409, "seller_unreachable")


async def test_contact_requires_auth(client: AsyncClient) -> None:
    assert (
        await client.post(f"/v1/marketplace/listings/{uuid.uuid4()}/contact")
    ).status_code == 401
    assert (await client.get("/v1/marketplace/listings/mine")).status_code == 401
