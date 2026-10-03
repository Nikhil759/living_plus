import uuid

from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models.enums import BusinessCategory, BusinessSort
from app.schemas.local_business import (
    BusinessAvailabilityIn,
    BusinessCardOut,
    BusinessDetailOut,
    BusinessIn,
)
from app.services import local_businesses as business_service

router = APIRouter(prefix="/local-businesses", tags=["local-businesses"])


@router.get("", response_model=list[BusinessCardOut])
async def browse_businesses(
    db: DbSession,
    member: CurrentMemberDep,
    category: BusinessCategory | None = None,
    taking_orders: bool = False,
    q: str | None = None,
    sort: BusinessSort = BusinessSort.recommended,
) -> list[BusinessCardOut]:
    return await business_service.browse(
        db, member, category=category, taking_orders=taking_orders, query=q, sort=sort
    )


@router.post("", response_model=BusinessDetailOut, status_code=201)
async def create_business(
    body: BusinessIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_service.create_business(db, member, body)


@router.get("/mine", response_model=list[BusinessCardOut])
async def my_businesses(db: DbSession, member: CurrentMemberDep) -> list[BusinessCardOut]:
    return await business_service.my_businesses(db, member)


@router.get("/{business_id}", response_model=BusinessDetailOut)
async def get_business(
    business_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_service.get_detail(db, member, business_id)


@router.put("/{business_id}", response_model=BusinessDetailOut)
async def update_business(
    business_id: uuid.UUID, body: BusinessIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_service.update_business(db, member, business_id, body)


@router.patch("/{business_id}/availability", response_model=BusinessDetailOut)
async def set_availability(
    business_id: uuid.UUID,
    body: BusinessAvailabilityIn,
    db: DbSession,
    member: CurrentMemberDep,
) -> BusinessDetailOut:
    return await business_service.set_availability(db, member, business_id, body.availability)
