"""Shared fixture and builders for the local business tests."""

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass

import pytest

from app.core.config import get_settings
from app.models import (
    BusinessAvailability,
    BusinessCategory,
    BusinessReviewStatus,
    BusinessServes,
    Flat,
    ListingContactMethod,
    LocalBusiness,
    Membership,
    MembershipRole,
    MembershipStatus,
    Society,
    Tower,
    User,
)

PHONE = "+919876501234"
COVER = "/images/local-businesses/amma-cover.jpg"
GALLERY = "/images/local-businesses/amma-1.jpg"


@dataclass
class World:
    society: Society
    member: User
    owner: User
    membership: Membership
    other_society: Society
    outsider: User


def make_user(email: str, name: str, phone: str | None = None) -> User:
    return User(id=uuid.uuid4(), supabase_uid=f"seed:{email}", email=email, name=name, phone=phone)


def make_membership(society: Society, flat: Flat, user: User) -> Membership:
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
    society = Society(id=uuid.uuid4(), name="Test Society", city="Gurgaon", invite_code="BIZ001")
    other_society = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="BIZ002")
    tower_b = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower B")
    tower_a = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower A")
    far_tower = Tower(id=uuid.uuid4(), society_id=other_society.id, name="Tower Z")
    flat_b = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_b.id, flat_no="204")
    flat_a = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower_a.id, flat_no="101")
    far_flat = Flat(
        id=uuid.uuid4(), society_id=other_society.id, tower_id=far_tower.id, flat_no="9"
    )
    member = make_user("demo@aangan.app", "Nikhil Bansal", PHONE)
    owner = make_user("lakshmi@aangan.app", "Lakshmi Iyer", "+919900011122")
    outsider = make_user("far@aangan.app", "Faraway Person", "+919900099999")
    db_session.add_all(
        [
            *(society, other_society, tower_a, tower_b, far_tower),
            *(flat_a, flat_b, far_flat, member, owner, outsider),
        ]
    )
    await db_session.flush()
    membership = make_membership(society, flat_b, member)
    db_session.add_all(
        [
            membership,
            make_membership(society, flat_a, owner),
            make_membership(other_society, far_flat, outsider),
        ]
    )
    await db_session.flush()
    yield World(society, member, owner, membership, other_society, outsider)
    get_settings.cache_clear()  # tests enable dev auth through the environment


def add_business(db_session, world: World, **overrides) -> LocalBusiness:
    fields = {
        "id": uuid.uuid4(),
        "society_id": world.society.id,
        "owner_id": world.owner.id,
        "name": "Amma's Tiffin",
        "category": BusinessCategory.food,
        "tagline": "Home-cooked South Indian meals",
        "about": "Fresh meals cooked every morning.",
        "cover_url": COVER,
        "photos": [GALLERY],
        "offerings": [
            {"name": "Veg meal", "price_inr": 120, "unit": "per_meal", "note": None},
            {"name": "Monthly plan", "price_inr": 3200, "unit": "per_month", "note": None},
        ],
        "timings": "11 AM - 2 PM",
        "days": ["mon", "tue", "wed", "thu", "fri"],
        "serves": BusinessServes.all_towers,
        "contact_method": ListingContactMethod.whatsapp,
        "availability": BusinessAvailability.taking_orders,
        "review_status": BusinessReviewStatus.approved,
    }
    fields.update(overrides)
    business = LocalBusiness(**fields)
    db_session.add(business)
    return business


def business_body(**overrides) -> dict:
    body = {
        "name": "Weekend Art Classes",
        "category": "tuition",
        "tagline": "Sketching and painting for kids",
        "about": "Small batches on Saturdays.",
        "coverUrl": COVER,
        "photos": [GALLERY],
        "offerings": [{"name": "Monthly batch", "priceInr": 1800, "unit": "per_month"}],
        "timings": "10 AM - 12 PM",
        "days": ["sat", "sun"],
        "serves": "within_society",
        "contactMethod": "whatsapp",
    }
    body.update(overrides)
    return body
