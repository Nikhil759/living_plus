import uuid
from datetime import date

from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.amenity import AmenityDetailOut, CrowdOut, SlotsOut
from app.schemas.home import AmenityOut
from app.services import amenities as amenity_service

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.get("", response_model=list[AmenityOut])
async def list_amenities(db: DbSession, member: CurrentMemberDep) -> list[AmenityOut]:
    return await amenity_service.list_amenities(db, member.society_id)


@router.get("/{amenity_id}", response_model=AmenityDetailOut)
async def get_amenity(
    amenity_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> AmenityDetailOut:
    return await amenity_service.get_amenity(db, member, amenity_id)


@router.get("/{amenity_id}/slots", response_model=SlotsOut)
async def get_slots(
    amenity_id: uuid.UUID,
    db: DbSession,
    member: CurrentMemberDep,
    day: date | None = None,
) -> SlotsOut:
    return await amenity_service.get_slots(db, member, amenity_id, day)


@router.get("/{amenity_id}/crowd", response_model=CrowdOut)
async def get_crowd(
    amenity_id: uuid.UUID,
    db: DbSession,
    member: CurrentMemberDep,
    day: date | None = None,
) -> CrowdOut:
    return await amenity_service.get_crowd(db, member, amenity_id, day)
