import uuid
from datetime import date

from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.amenity import (
    AmenityDetailOut,
    BookingIn,
    BookingOut,
    CrowdOut,
    SlotsOut,
)
from app.schemas.home import AmenityOut
from app.services import amenities as amenity_service
from app.services import amenity_bookings as booking_service

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.get("", response_model=list[AmenityOut])
async def list_amenities(db: DbSession, member: CurrentMemberDep) -> list[AmenityOut]:
    return await amenity_service.list_amenities(db, member.society_id)


@router.get("/bookings/mine", response_model=list[BookingOut])
async def my_bookings(db: DbSession, member: CurrentMemberDep) -> list[BookingOut]:
    return await booking_service.my_bookings(db, member)


@router.delete("/bookings/{booking_id}", response_model=BookingOut)
async def cancel_booking(
    booking_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> BookingOut:
    return await booking_service.cancel_booking(db, member, booking_id)


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


@router.post("/{amenity_id}/bookings", response_model=BookingOut, status_code=201)
async def book_slot(
    amenity_id: uuid.UUID, body: BookingIn, db: DbSession, member: CurrentMemberDep
) -> BookingOut:
    return await booking_service.book_slot(db, member, amenity_id, body)
