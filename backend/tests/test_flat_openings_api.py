import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.models import OpeningFurnishing, OpeningKind, OpeningPreference, OpeningStatus
from app.schemas.flat_opening import today_ist
from tests.business_world import PHONE, World
from tests.opening_world import add_opening, opening_body, tower_named
from tests.test_me_api import _enable_local_dev_auth


async def test_openings_require_auth(client: AsyncClient) -> None:
    path = f"/v1/flat-openings/{uuid.uuid4()}"
    assert (await client.get("/v1/flat-openings")).status_code == 401
    assert (await client.get("/v1/flat-openings/options")).status_code == 401
    assert (await client.get(path)).status_code == 401
    assert (await client.post("/v1/flat-openings", json={})).status_code == 401
    assert (await client.put(path, json={})).status_code == 401


async def test_list_shows_only_live_openings_of_own_society(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime.now(UTC)
    await add_opening(db_session, world, description="Visible")
    await add_opening(db_session, world, status=OpeningStatus.filled)
    await add_opening(db_session, world, status=OpeningStatus.removed)
    await add_opening(db_session, world, expires_at=now - timedelta(hours=1))
    far_tower = await tower_named(db_session, world.other_society.id, "Tower Z")
    await add_opening(
        db_session,
        world,
        society_id=world.other_society.id,
        poster_id=world.outsider.id,
        tower_id=far_tower.id,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get("/v1/flat-openings")
    assert response.status_code == 200
    [card] = response.json()
    assert card["description"] == "Visible"
    assert card["title"] == "Room in 1 BHK · Tower A"
    assert (card["tower"], card["floor"], card["postedBy"]) == ("Tower A", 5, "Lakshmi")
    assert (card["state"], card["isMine"], card["availableFrom"]) == ("active", False, None)
    assert card["contactMethod"] == "whatsapp"
    text = str(card).lower()
    assert "flat_no" not in text and "flatno" not in text and "phone" not in text


async def test_titles_are_generated_from_kind_bhk_and_tower(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    tower_b = await tower_named(db_session, world.society.id, "Tower B")
    await add_opening(
        db_session, world, kind=OpeningKind.flatmate_needed, bhk=2, tower_id=tower_b.id
    )
    await add_opening(db_session, world, kind=OpeningKind.full_flat, bhk=4)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    titles = {card["title"] for card in (await client.get("/v1/flat-openings")).json()}
    assert titles == {"Flatmate for 2 BHK · Tower B", "Entire 4+ BHK · Tower A"}


async def test_list_filters_and_sort(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    await add_opening(db_session, world, description="room-18k", rent_inr=18_000)
    await add_opening(db_session, world, description="room-20k", rent_inr=20_000, bhk=2)
    await add_opening(
        db_session, world, description="mate-16k", kind=OpeningKind.flatmate_needed, rent_inr=16_000
    )
    await add_opening(
        db_session,
        world,
        description="flat-40k",
        kind=OpeningKind.full_flat,
        rent_inr=40_000,
        furnishing=OpeningFurnishing.unfurnished,
    )
    await add_opening(
        db_session,
        world,
        description="flat-65k",
        kind=OpeningKind.full_flat,
        rent_inr=65_000,
        bhk=3,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)

    async def found(query: str) -> list[str]:
        response = await client.get(f"/v1/flat-openings?{query}")
        assert response.status_code == 200
        return sorted(card["description"] for card in response.json())

    assert await found("kind=room_available&budget=under_20k") == ["room-18k"]
    assert await found("budget=from_20k_to_40k") == ["flat-40k", "room-20k"]
    assert await found("budget=over_40k") == ["flat-65k"]
    assert await found("bhk=2") == ["room-20k"]
    assert await found("furnishing=unfurnished") == ["flat-40k"]
    ordered = (await client.get("/v1/flat-openings?sort=rent_asc")).json()
    assert [card["rentInr"] for card in ordered] == [16_000, 18_000, 20_000, 40_000, 65_000]
    assert (await client.get("/v1/flat-openings?bhk=9")).status_code == 422
    assert (await client.get("/v1/flat-openings?kind=castle")).status_code == 422


async def test_list_is_newest_first_and_past_dates_read_as_available_now(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime.now(UTC)
    soon = today_ist() + timedelta(days=12)
    await add_opening(db_session, world, description="old", listed_at=now - timedelta(days=5))
    await add_opening(
        db_session,
        world,
        description="new",
        listed_at=now - timedelta(hours=1),
        available_from=soon,
    )
    await add_opening(
        db_session,
        world,
        description="past date",
        listed_at=now - timedelta(days=3),
        available_from=today_ist() - timedelta(days=4),
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    cards = (await client.get("/v1/flat-openings")).json()
    assert [card["description"] for card in cards] == ["new", "past date", "old"]
    assert cards[0]["availableFrom"] == soon.isoformat()
    assert cards[1]["availableFrom"] is None


async def test_detail_has_facts_and_never_exposes_phone_or_unit(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    opening = await add_opening(
        db_session,
        world,
        deposit_inr=40_000,
        maintenance_included=False,
        maintenance_inr=2_500,
        included=["wifi", "cook"],
        preference=OpeningPreference.women_only,
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    response = await client.get(f"/v1/flat-openings/{opening.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["depositInr"] == 40_000
    assert (body["maintenanceIncluded"], body["maintenanceInr"]) == (False, 2_500)
    assert body["included"] == ["wifi", "cook"]
    assert body["poster"] == {"firstName": "Lakshmi", "tower": "Tower A"}
    assert (body["canRemove"], body["canRenew"], body["expiresAt"]) == (False, False, None)
    assert "900011122" not in response.text and "flatNo" not in response.text


async def test_detail_wrong_society_and_removed_are_hidden(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    far_tower = await tower_named(db_session, world.other_society.id, "Tower Z")
    foreign = await add_opening(
        db_session,
        world,
        society_id=world.other_society.id,
        poster_id=world.outsider.id,
        tower_id=far_tower.id,
    )
    removed = await add_opening(db_session, world, status=OpeningStatus.removed)
    filled = await add_opening(db_session, world, status=OpeningStatus.filled)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    assert (await client.get(f"/v1/flat-openings/{foreign.id}")).status_code == 404
    assert (await client.get(f"/v1/flat-openings/{removed.id}")).status_code == 404
    shown = await client.get(f"/v1/flat-openings/{filled.id}")
    assert shown.json()["state"] == "filled"  # shared links explain, rather than 404


async def test_options_prefill_tower_and_list_towers(
    client: AsyncClient, world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    body = (await client.get("/v1/flat-openings/options")).json()
    assert body["firstName"] == "Nikhil"
    assert body["hasPhone"] is True
    names = [tower["name"] for tower in body["towers"]]
    assert names == ["Tower A", "Tower B"]  # own society only
    assert body["towerId"] == next(t["id"] for t in body["towers"] if t["name"] == "Tower B")


async def test_create_publishes_immediately_for_30_days(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    body = await opening_body(db_session, world)
    response = await client.post("/v1/flat-openings", json=body)
    assert response.status_code == 201
    created = response.json()
    assert created["title"] == "Flatmate for 2 BHK · Tower A"
    assert (created["isMine"], created["state"], created["canRemove"]) == (True, "active", True)
    expires = datetime.fromisoformat(created["expiresAt"])
    assert timedelta(days=29, hours=23) < expires - datetime.now(UTC) < timedelta(days=30, hours=1)
    listed = (await client.get("/v1/flat-openings")).json()
    assert listed[0]["id"] == created["id"]
    assert PHONE not in response.text


async def test_create_validation(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    today = today_ist()
    bad = {
        "rentInr": 999,
        "description": "   ",
        "bhk": 5,
        "floor": 99,
        "availableFrom": (today - timedelta(days=1)).isoformat(),
        "included": ["wifi", "wifi"],
        "kind": "castle",
    }
    for field, value in bad.items():
        body = await opening_body(db_session, world, **{field: value})
        response = await client.post("/v1/flat-openings", json=body)
        assert response.status_code == 422, field
    too_long = await opening_body(db_session, world, description="x" * 401)
    assert (await client.post("/v1/flat-openings", json=too_long)).status_code == 422
    expensive = await opening_body(db_session, world, rentInr=500_001)
    assert (await client.post("/v1/flat-openings", json=expensive)).status_code == 422
    far = await opening_body(
        db_session, world, availableFrom=(today + timedelta(days=400)).isoformat()
    )
    assert (await client.post("/v1/flat-openings", json=far)).status_code == 422
    assert (await client.post("/v1/flat-openings", json={})).status_code == 422
    assert (await client.get("/v1/flat-openings")).json() == []


async def test_preference_must_fit_the_kind_of_opening(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    family_room = await opening_body(db_session, world, kind="room_available", preference="family")
    assert (await client.post("/v1/flat-openings", json=family_room)).status_code == 422
    women_flat = await opening_body(db_session, world, kind="full_flat", preference="women_only")
    assert (await client.post("/v1/flat-openings", json=women_flat)).status_code == 422
    good = await opening_body(db_session, world, kind="full_flat", preference="family")
    assert (await client.post("/v1/flat-openings", json=good)).status_code == 201


async def test_maintenance_rules(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    missing = await opening_body(db_session, world, maintenanceIncluded=False)
    assert (await client.post("/v1/flat-openings", json=missing)).status_code == 422
    extra = await opening_body(db_session, world, maintenanceIncluded=True, maintenanceInr=3_000)
    created = (await client.post("/v1/flat-openings", json=extra)).json()
    assert created["maintenanceInr"] is None  # ignored while "included"
    paid = await opening_body(db_session, world, maintenanceIncluded=False, maintenanceInr=2_000)
    shown = (await client.post("/v1/flat-openings", json=paid)).json()
    assert (shown["maintenanceIncluded"], shown["maintenanceInr"]) == (False, 2_000)


async def test_create_rejects_a_tower_from_another_society(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    far_tower = await tower_named(db_session, world.other_society.id, "Tower Z")
    body = await opening_body(db_session, world, towerId=str(far_tower.id))
    response = await client.post("/v1/flat-openings", json=body)
    assert (response.status_code, response.json()["code"]) == (422, "invalid_tower")


async def test_society_id_in_body_is_ignored(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_local_dev_auth(monkeypatch)
    body = await opening_body(
        db_session, world, societyId=str(world.other_society.id), posterId=str(world.owner.id)
    )
    created = (await client.post("/v1/flat-openings", json=body)).json()
    assert created["isMine"] is True
    assert len((await client.get("/v1/flat-openings")).json()) == 1


async def test_phone_is_needed_once_and_is_stored_not_returned(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    world.member.phone = None
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = await opening_body(db_session, world)
    refused = await client.post("/v1/flat-openings", json=body)
    assert (refused.status_code, refused.json()["code"]) == (422, "phone_required")
    ok = await client.post("/v1/flat-openings", json={**body, "phone": "98765 43210"})
    assert ok.status_code == 201 and "9876543210" not in ok.text
    await db_session.refresh(world.member)
    assert world.member.phone == "9876543210"
    bad = await client.post("/v1/flat-openings", json={**body, "phone": "abc"})
    assert bad.status_code == 422


async def test_owner_edits_and_others_cannot(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    mine = await add_opening(db_session, world, poster_id=world.member.id)
    theirs = await add_opening(db_session, world)
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = await opening_body(db_session, world, rentInr=17_500, description="Updated text")
    edited = await client.put(f"/v1/flat-openings/{mine.id}", json=body)
    assert edited.status_code == 200
    assert (edited.json()["rentInr"], edited.json()["description"]) == (17_500, "Updated text")
    forbidden = await client.put(f"/v1/flat-openings/{theirs.id}", json=body)
    assert (forbidden.status_code, forbidden.json()["code"]) == (403, "forbidden")
    invalid = await client.put(f"/v1/flat-openings/{mine.id}", json={**body, "rentInr": 1})
    assert invalid.status_code == 422
    missing = await client.put(f"/v1/flat-openings/{uuid.uuid4()}", json=body)
    assert missing.status_code == 404


async def test_filled_opening_cannot_be_edited(
    client: AsyncClient, world: World, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    filled = await add_opening(
        db_session, world, poster_id=world.member.id, status=OpeningStatus.filled
    )
    await db_session.flush()
    _enable_local_dev_auth(monkeypatch)
    body = await opening_body(db_session, world)
    response = await client.put(f"/v1/flat-openings/{filled.id}", json=body)
    assert (response.status_code, response.json()["code"]) == (409, "opening_closed")
