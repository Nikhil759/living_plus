import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.models import BusinessAvailability, BusinessCategory, BusinessRecommendation
from app.models.enums import BusinessReviewStatus
from tests.business_world import (
    COVER,
    PHONE,
    World,
    add_business,
    business_body,
)
from tests.test_me_api import _enable_local_dev_auth
from tests.test_uploads_api import _PNG


async def test_businesses_require_auth(client: AsyncClient) -> None:
    business_id = uuid.uuid4()
    path = f"/v1/local-businesses/{business_id}"
    assert (await client.get("/v1/local-businesses")).status_code == 401
    assert (await client.get("/v1/local-businesses/mine")).status_code == 401
    assert (await client.get(path)).status_code == 401
    assert (await client.post("/v1/local-businesses", json=business_body())).status_code == 401
    assert (await client.put(path, json=business_body())).status_code == 401
    patch = await client.patch(f"{path}/availability", json={"availability": "on_break"})
    assert patch.status_code == 401


async def test_directory_shows_only_approved_businesses_of_own_society(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    add_business(db_session, world, name="Visible tiffin")
    add_business(db_session, world, name="Pending", review_status=BusinessReviewStatus.pending)
    add_business(db_session, world, name="Rejected", review_status=BusinessReviewStatus.rejected)
    add_business(db_session, world, name="Removed", review_status=BusinessReviewStatus.removed)
    add_business(
        db_session,
        world,
        name="Elsewhere tiffin",
        society_id=world.other_society.id,
        owner_id=world.outsider.id,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/local-businesses")
    assert response.status_code == 200
    [card] = response.json()
    assert card["name"] == "Visible tiffin"
    assert card["ownerFirstName"] == "Lakshmi"
    assert card["tower"] == "Tower A"
    assert card["startingPrice"] == {"priceInr": 120, "unit": "per_meal"}
    assert card["recommendationCount"] == 0
    assert (card["availability"], card["isMine"]) == ("taking_orders", False)
    assert "phone" not in card and "distance" not in str(card).lower()


async def test_directory_filters_search_and_sort(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    base = datetime.now(UTC)
    tiffin = add_business(
        db_session, world, name="Amma's Tiffin", created_at=base - timedelta(days=3)
    )
    maths = add_business(
        db_session,
        world,
        name="Focus Maths",
        category=BusinessCategory.tuition,
        tagline="Maths for classes 6-10",
        offerings=[{"name": "Class 6-8", "price_inr": 2500, "unit": "per_month", "note": None}],
        availability=BusinessAvailability.fully_booked,
        created_at=base - timedelta(days=2),
    )
    add_business(
        db_session,
        world,
        name="Yoga with Meera",
        category=BusinessCategory.wellness,
        about="Morning batch for beginners",
        created_at=base - timedelta(days=1),
    )
    await db_session.flush()
    db_session.add_all(
        [
            BusinessRecommendation(
                id=uuid.uuid4(), business_id=maths.id, society_id=world.society.id, user_id=user.id
            )
            for user in (world.member, world.outsider)
        ]
        + [
            BusinessRecommendation(
                id=uuid.uuid4(),
                business_id=tiffin.id,
                society_id=world.society.id,
                user_id=world.member.id,
            )
        ]
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)

    async def names(**params: str) -> list[str]:
        response = await client.get("/v1/local-businesses", params=params)
        assert response.status_code == 200
        return [card["name"] for card in response.json()]

    assert await names() == ["Focus Maths", "Amma's Tiffin", "Yoga with Meera"]
    assert await names(sort="newest") == ["Yoga with Meera", "Focus Maths", "Amma's Tiffin"]
    assert await names(category="tuition") == ["Focus Maths"]
    assert await names(taking_orders="true") == ["Amma's Tiffin", "Yoga with Meera"]
    assert await names(q="class 6") == ["Focus Maths"]  # offering name
    assert await names(q="BEGINNERS") == ["Yoga with Meera"]  # description
    assert await names(q="tiffin") == ["Amma's Tiffin"]  # name
    assert await names(q="nothing like this") == []
    invalid = await client.get("/v1/local-businesses", params={"category": "plumbing"})
    assert invalid.status_code == 422


async def test_detail_has_owner_and_never_exposes_phone(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world.owner.created_at = datetime(2022, 5, 1, tzinfo=UTC)
    business = add_business(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get(f"/v1/local-businesses/{business.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["owner"] == {
        "firstName": "Lakshmi",
        "avatarUrl": None,
        "tower": "Tower A",
        "memberSince": 2022,
    }
    assert [o["unit"] for o in body["offerings"]] == ["per_meal", "per_month"]
    assert body["days"] == ["mon", "tue", "wed", "thu", "fri"]
    assert (body["canManage"], body["canReview"]) == (False, False)
    assert "9900011122" not in response.text and PHONE[3:] not in response.text


async def test_detail_wrong_society_and_unapproved_are_hidden(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    foreign = add_business(
        db_session, world, society_id=world.other_society.id, owner_id=world.outsider.id
    )
    pending = add_business(db_session, world, review_status=BusinessReviewStatus.pending)
    removed = add_business(db_session, world, review_status=BusinessReviewStatus.removed)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    for business in (foreign, pending, removed):
        assert (await client.get(f"/v1/local-businesses/{business.id}")).status_code == 404
    update = await client.put(f"/v1/local-businesses/{foreign.id}", json=business_body())
    assert update.status_code == 404
    patch = await client.patch(
        f"/v1/local-businesses/{foreign.id}/availability", json={"availability": "on_break"}
    )
    assert patch.status_code == 404


async def test_create_goes_to_pending_and_owner_sees_it(
    client: AsyncClient,
    world: World,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post("/v1/local-businesses", json=business_body(name="  Weekend Art  "))
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Weekend Art"
    assert (body["reviewStatus"], body["canManage"], body["isMine"]) == ("pending", True, True)
    assert body["tower"] == "Tower B"
    assert body["offerings"][0]["note"] is None
    assert (await client.get("/v1/local-businesses")).json() == []
    mine = (await client.get("/v1/local-businesses/mine")).json()
    assert [(card["id"], card["reviewStatus"]) for card in mine] == [(body["id"], "pending")]
    assert (await client.get(f"/v1/local-businesses/{body['id']}")).status_code == 200


async def test_create_validation(
    client: AsyncClient,
    world: World,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_local_dev_auth(monkeypatch)
    offering = {"name": "Class", "priceInr": 100, "unit": "each"}
    bad_bodies = [
        business_body(name=""),
        business_body(name="x" * 51),
        business_body(tagline="x" * 81),
        business_body(about="x" * 601),
        business_body(category="plumbing"),
        business_body(coverUrl="https://evil.example/pic.jpg"),
        business_body(photos=["https://evil.example/pic.jpg"]),
        business_body(photos=[COVER]),
        business_body(photos=[f"/images/local-businesses/p{i}.jpg" for i in range(7)]),
        business_body(offerings=[]),
        business_body(offerings=[{**offering, "priceInr": 0}]),
        business_body(offerings=[{**offering, "unit": "per_year"}]),
        business_body(offerings=[{**offering, "note": "x" * 61}]),
        business_body(days=[]),
        business_body(days=["sat", "sat"]),
        business_body(timings=""),
        business_body(serves="worldwide"),
        business_body(contactMethod="email"),
        business_body(phone="12ab"),
    ]
    for body in bad_bodies:
        response = await client.post("/v1/local-businesses", json=body)
        assert response.status_code == 422, body
        assert response.json()["code"] == "validation_error"


async def test_society_id_in_body_is_ignored(
    client: AsyncClient,
    world: World,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_local_dev_auth(monkeypatch)
    response = await client.post(
        "/v1/local-businesses", json=business_body(societyId=str(world.other_society.id))
    )
    assert response.status_code == 201
    assert len((await client.get("/v1/local-businesses/mine")).json()) == 1


async def test_phone_is_needed_once_and_is_stored_not_returned(
    client: AsyncClient,
    world: World,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world.member.phone = None
    _enable_local_dev_auth(monkeypatch)
    missing = await client.post("/v1/local-businesses", json=business_body())
    assert missing.status_code == 422
    assert missing.json()["code"] == "phone_required"
    ok = await client.post("/v1/local-businesses", json=business_body(phone="98765 43210"))
    assert ok.status_code == 201
    assert "9876543210" not in ok.text
    assert world.member.phone == "9876543210"


async def test_owner_edit_and_rejected_listing_returns_to_pending(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rejected = add_business(
        db_session,
        world,
        owner_id=world.member.id,
        review_status=BusinessReviewStatus.rejected,
        rejection_reason="Please add a clearer cover photo.",
    )
    approved = add_business(db_session, world, owner_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    seen = (await client.get(f"/v1/local-businesses/{rejected.id}")).json()
    assert seen["rejectionReason"] == "Please add a clearer cover photo."
    fixed = await client.put(
        f"/v1/local-businesses/{rejected.id}", json=business_body(name="Better")
    )
    assert fixed.status_code == 200
    assert (fixed.json()["reviewStatus"], fixed.json()["rejectionReason"]) == ("pending", None)
    still = await client.put(
        f"/v1/local-businesses/{approved.id}", json=business_body(name="Renamed")
    )
    assert (still.json()["name"], still.json()["reviewStatus"]) == ("Renamed", "approved")


async def test_only_the_owner_can_edit_or_change_status(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    business = add_business(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    path = f"/v1/local-businesses/{business.id}"
    put = await client.put(path, json=business_body())
    assert (put.status_code, put.json()["code"]) == (403, "forbidden")
    patch = await client.patch(f"{path}/availability", json={"availability": "on_break"})
    assert patch.status_code == 403


async def test_owner_switches_availability(
    client: AsyncClient,
    world: World,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    business = add_business(db_session, world, owner_id=world.member.id)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    path = f"/v1/local-businesses/{business.id}/availability"
    response = await client.patch(path, json={"availability": "fully_booked"})
    assert response.status_code == 200
    assert response.json()["availability"] == "fully_booked"
    cards = (await client.get("/v1/local-businesses")).json()
    assert cards[0]["availability"] == "fully_booked"
    assert (await client.patch(path, json={"availability": "closed"})).status_code == 422


async def test_business_photo_upload_and_fetch(
    client: AsyncClient,
    world: World,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    files = {"file": ("a.png", _PNG, "image/png")}
    assert (await client.post("/v1/uploads/business-photos", files=files)).status_code == 401
    _enable_local_dev_auth(monkeypatch)
    uploaded = await client.post("/v1/uploads/business-photos", files=files)
    assert uploaded.status_code == 200
    url = uploaded.json()["url"]
    assert url.startswith("/v1/uploads/business-photos/")
    fetched = await client.get(url)
    assert fetched.content.startswith(b"\x89PNG")
    created = await client.post("/v1/local-businesses", json=business_body(coverUrl=url))
    assert created.status_code == 201
    bad = await client.post(
        "/v1/uploads/business-photos", files={"file": ("n.txt", b"hello", "text/plain")}
    )
    assert bad.status_code == 422
    assert (await client.get("/v1/uploads/business-photos/../config.py")).status_code == 404
