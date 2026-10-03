"""Builders for the flat opening tests. Pair with the `world` fixture from business_world."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models import (
    FlatOpening,
    ListingContactMethod,
    OpeningFurnishing,
    OpeningKind,
    OpeningPreference,
    OpeningStatus,
    Tower,
)
from tests.business_world import World


async def tower_named(db_session, society_id: uuid.UUID, name: str) -> Tower:
    result = await db_session.execute(
        select(Tower).where(Tower.society_id == society_id, Tower.name == name)
    )
    return result.scalar_one()


async def add_opening(db_session, world: World, **overrides) -> FlatOpening:
    """By default: an active 18,000 room in Tower A posted by the owner user."""
    now = datetime.now(UTC)
    if "tower_id" not in overrides:
        overrides["tower_id"] = (await tower_named(db_session, world.society.id, "Tower A")).id
    fields = {
        "id": uuid.uuid4(),
        "society_id": world.society.id,
        "poster_id": world.owner.id,
        "kind": OpeningKind.room_available,
        "bhk": 1,
        "floor": 5,
        "furnishing": OpeningFurnishing.furnished,
        "rent_inr": 18_000,
        "deposit_inr": 36_000,
        "maintenance_included": True,
        "maintenance_inr": None,
        "available_from": None,
        "preference": OpeningPreference.anyone,
        "included": ["wifi", "ac"],
        "description": "Bright room in a quiet flat.",
        "contact_method": ListingContactMethod.whatsapp,
        "status": OpeningStatus.active,
        "listed_at": now - timedelta(days=2),
        "expires_at": now + timedelta(days=28),
    }
    fields.update(overrides)
    opening = FlatOpening(**fields)
    db_session.add(opening)
    return opening


async def opening_body(db_session, world: World, **overrides) -> dict:
    tower = await tower_named(db_session, world.society.id, "Tower A")
    body = {
        "kind": "flatmate_needed",
        "towerId": str(tower.id),
        "floor": 4,
        "bhk": 2,
        "furnishing": "semi_furnished",
        "rentInr": 15_000,
        "depositInr": 30_000,
        "maintenanceIncluded": True,
        "availableFrom": None,
        "preference": "anyone",
        "included": ["wifi", "parking"],
        "description": "Second bedroom free in a sunny 2 BHK.",
        "contactMethod": "whatsapp",
    }
    body.update(overrides)
    return body
