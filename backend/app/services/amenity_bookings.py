"""Booking, cancelling and listing amenity slots. One confirmed booking per slot, enforced
by a partial unique index so two simultaneous confirms can never both win."""

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import Amenity, AmenityBooking
from app.models.enums import AmenityBookingStatus
from app.schemas.amenity import BookingIn, BookingOut
from app.services import amenities as amenity_service


def _slot_taken() -> AppError:
    return AppError("slot_taken", "Just taken, pick another slot.", 409)


def _to_out(booking: AmenityBooking, amenity_name: str) -> BookingOut:
    return BookingOut(
        id=str(booking.id),
        amenity_id=str(booking.amenity_id),
        amenity_name=amenity_name,
        starts_at=booking.starts_at,
        ends_at=booking.ends_at,
    )


async def _bookings_that_day(
    db: AsyncSession, member: CurrentMember, amenity: Amenity, start: datetime, end: datetime
) -> int:
    return int(
        await db.scalar(
            select(func.count())
            .select_from(AmenityBooking)
            .where(
                AmenityBooking.amenity_id == amenity.id,
                AmenityBooking.user_id == member.user.id,
                AmenityBooking.status == AmenityBookingStatus.confirmed,
                AmenityBooking.starts_at >= start,
                AmenityBooking.starts_at < end,
            )
        )
        or 0
    )


async def _slot_is_taken(db: AsyncSession, amenity_id: uuid.UUID, starts: datetime) -> bool:
    taken = await db.scalar(
        select(AmenityBooking.id).where(
            AmenityBooking.amenity_id == amenity_id,
            AmenityBooking.starts_at == starts,
            AmenityBooking.status == AmenityBookingStatus.confirmed,
        )
    )
    return taken is not None


async def _check_slot_rules(
    db: AsyncSession, member: CurrentMember, amenity: Amenity, starts: datetime
) -> None:
    now = amenity_service.current_time()
    local = starts.astimezone(amenity_service.IST)
    if local.minute or local.second or local.microsecond:
        raise AppError("validation_error", "Pick a one-hour slot.", 422)
    if starts <= now:
        raise AppError("validation_error", "That slot has already started.", 422)
    amenity_service.resolve_day(amenity, local.date(), now)
    opens, closes = amenity_service.hours_for(amenity, local.date())
    if not opens <= local.hour < closes:
        raise AppError("validation_error", "That slot is outside opening hours.", 422)

    label = amenity_service.blocked_hours(amenity, local.date()).get(local.hour)
    if label is not None:
        raise AppError("slot_blocked", f"That slot is blocked for {label}.", 409)

    day_start, day_end = amenity_service.day_bounds(local.date())
    limit = amenity_service.max_hours_per_day(amenity)
    if await _bookings_that_day(db, member, amenity, day_start, day_end) >= limit:
        raise AppError(
            "daily_limit",
            f"You can book at most {limit} hours a day on {amenity.name}.",
            422,
        )


async def book_slot(
    db: AsyncSession, member: CurrentMember, amenity_id: str, body: BookingIn
) -> BookingOut:
    amenity, status = await amenity_service.load_amenity(db, member, amenity_id)
    if amenity_service.kind_of(amenity) != "bookable":
        raise AppError("validation_error", "This amenity is not booked by slot.", 422)
    note = amenity_service.closure_note(status)
    if note is not None:
        raise AppError("amenity_closed", note, 409)

    starts = amenity_service.as_utc(body.starts_at)
    await _check_slot_rules(db, member, amenity, starts)

    if await _slot_is_taken(db, amenity.id, starts):
        raise _slot_taken()

    booking = AmenityBooking(
        amenity_id=amenity.id,
        society_id=member.society_id,
        user_id=member.user.id,
        starts_at=starts,
        ends_at=starts + amenity_service.SLOT,
        status=AmenityBookingStatus.confirmed,
    )
    db.add(booking)
    try:
        await db.commit()
    except IntegrityError:
        # A simultaneous confirm won the slot between our check and the insert.
        await db.rollback()
        raise _slot_taken() from None
    return _to_out(booking, amenity.name)


async def cancel_booking(
    db: AsyncSession, member: CurrentMember, booking_id: uuid.UUID
) -> BookingOut:
    row = (
        await db.execute(
            select(AmenityBooking, Amenity.name)
            .join(Amenity, Amenity.id == AmenityBooking.amenity_id)
            .where(
                AmenityBooking.id == booking_id,
                AmenityBooking.society_id == member.society_id,
                AmenityBooking.user_id == member.user.id,
                AmenityBooking.status == AmenityBookingStatus.confirmed,
            )
        )
    ).first()
    if row is None:
        raise AppError("not_found", "Booking not found.", 404)
    booking, name = row
    if booking.starts_at <= amenity_service.current_time():
        raise AppError("validation_error", "Past bookings can't be cancelled.", 422)
    booking.status = AmenityBookingStatus.cancelled
    await db.commit()
    return _to_out(booking, name)


async def my_bookings(db: AsyncSession, member: CurrentMember) -> list[BookingOut]:
    rows = (
        await db.execute(
            select(AmenityBooking, Amenity.name)
            .join(Amenity, Amenity.id == AmenityBooking.amenity_id)
            .where(
                AmenityBooking.society_id == member.society_id,
                AmenityBooking.user_id == member.user.id,
                AmenityBooking.status == AmenityBookingStatus.confirmed,
                AmenityBooking.ends_at > amenity_service.current_time(),
            )
            .order_by(AmenityBooking.starts_at)
        )
    ).all()
    return [_to_out(booking, name) for booking, name in rows]
