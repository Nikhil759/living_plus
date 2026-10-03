"""Amenity schedule, live status and crowd patterns.

Wall-clock times are IST; the database stores UTC. Per-amenity config lives in the existing
`open_hours` and `rules` JSON columns:
  rules = {advance_days, max_hours_per_day, blocks: [{label, days, start, end}],
           crowd: {weekday: [24 levels], weekend: [24 levels]}}
Crowd levels are 0 quiet, 1 moderate, 2 busy. Weekdays follow Python (Mon=0).
"""

import re
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta, timezone
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import Amenity, AmenityBooking, AmenityStatus
from app.models.enums import AmenityBookingStatus, AmenityType, CrowdLevel, MembershipRole
from app.schemas.amenity import (
    AmenityClosureIn,
    AmenityDetailOut,
    CrowdHourOut,
    CrowdOut,
    SlotOut,
    SlotsOut,
)
from app.schemas.home import AmenityOut

IST = timezone(timedelta(hours=5, minutes=30))

Kind = Literal["bookable", "walk_in", "space"]
Level = Literal["quiet", "moderate", "busy", "closed"]

DEFAULT_OPEN_HOUR = 6
DEFAULT_CLOSE_HOUR = 22
DEFAULT_ADVANCE_DAYS = 7
SLOT = timedelta(hours=1)
DEFAULT_MAX_HOURS_PER_DAY = 2

_EN = "\u2013"
_DAY_NAMES = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
_WEEKDAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
_LEVELS: tuple[Level, ...] = ("quiet", "moderate", "busy")
_PEOPLE_SHARE = {"quiet": 0.1, "moderate": 0.35, "busy": 0.7}
_UI_STATUS = {"quiet": "quiet", "moderate": "moderate", "busy": "booked", "closed": "closed"}
_CATEGORY_ORDER = {"sports": 0, "fitness": 1, "other": 2, "spaces": 3}

_AMENITY_EMOJI: dict[str, str] = {
    "gym": "💪",
    "pool": "🏊",
    "badminton": "🏸",
    "tennis": "🎾",
    "hall": "🏛️",
    "amphitheatre": "🎭",
    "café": "☕",
    "cafe": "☕",
}

_RULE_LINES: dict[AmenityType, list[str]] = {
    AmenityType.court: [
        "Book up to 7 days ahead, 2 hours a day at most.",
        "Non-marking shoes only.",
        "Cancel early if your plans change.",
    ],
    AmenityType.gym: [
        "Wipe equipment after use.",
        "Footwear and a towel are required.",
        "Re-rack your weights.",
    ],
    AmenityType.pool: [
        "Shower before you swim.",
        "Swim caps are required.",
        "Children under 12 need an adult.",
    ],
    AmenityType.hall: [
        "Hosted through an event, so committee approval applies.",
        "Leave the hall clean.",
        "Music off by 10 PM.",
    ],
    AmenityType.amphitheatre: [
        "Hosted through an event, so committee approval applies.",
        "No amplified sound after 9 PM.",
        "Clear the stage and seating afterwards.",
    ],
    AmenityType.other: [
        "Keep noise low.",
        "Clear your table when you leave.",
        "Take your trash with you.",
    ],
}


def current_time() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class Occupied:
    kind: Literal["booked", "blocked"]
    label: str | None = None
    user_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None


def kind_of(amenity: Amenity) -> Kind:
    if amenity.amenity_type == AmenityType.court:
        return "bookable"
    if amenity.amenity_type in (AmenityType.hall, AmenityType.amphitheatre):
        return "space"
    return "walk_in"


def category_of(amenity: Amenity) -> Literal["sports", "fitness", "spaces", "other"]:
    kind = kind_of(amenity)
    if kind == "bookable":
        return "sports"
    if kind == "space":
        return "spaces"
    if amenity.amenity_type in (AmenityType.gym, AmenityType.pool):
        return "fitness"
    return "other"


def _slug(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def _emoji(name: str) -> str:
    lower = name.lower()
    for key, emoji in _AMENITY_EMOJI.items():
        if key in lower:
            return emoji
    return "📍"


def _rules(amenity: Amenity) -> dict[str, Any]:
    return amenity.rules or {}


def _advance_days(amenity: Amenity) -> int:
    return int(_rules(amenity).get("advance_days") or DEFAULT_ADVANCE_DAYS)


def max_hours_per_day(amenity: Amenity) -> int:
    return int(_rules(amenity).get("max_hours_per_day") or DEFAULT_MAX_HOURS_PER_DAY)


def _hour_of(value: object, fallback: int) -> int:
    if isinstance(value, str) and re.match(r"^\d{1,2}:\d{2}$", value):
        return int(value.split(":")[0])
    return fallback


def hours_for(amenity: Amenity, day: date) -> tuple[int, int]:
    entry = (amenity.open_hours or {}).get(_WEEKDAY_KEYS[day.weekday()])
    if not isinstance(entry, dict):
        return DEFAULT_OPEN_HOUR, DEFAULT_CLOSE_HOUR
    return (
        _hour_of(entry.get("open"), DEFAULT_OPEN_HOUR),
        _hour_of(entry.get("close"), DEFAULT_CLOSE_HOUR),
    )


def _fmt_hour(hour: int) -> str:
    return f"{(hour % 24) % 12 or 12} {'AM' if hour % 24 < 12 else 'PM'}"


def _slot_label(hour: int) -> str:
    start, end = _fmt_hour(hour), _fmt_hour(hour + 1)
    if start[-2:] == end[-2:]:
        return f"{start[:-3]}{_EN}{end}"
    return f"{start}{_EN}{end}"


def hours_label(amenity: Amenity) -> str:
    monday = date(2024, 1, 1)
    groups: list[list[Any]] = []
    for index in range(7):
        span = hours_for(amenity, monday + timedelta(days=index))
        if groups and groups[-1][2] == span:
            groups[-1][1] = index
        else:
            groups.append([index, index, span])
    if len(groups) == 1:
        opens, closes = groups[0][2]
        return f"{_fmt_hour(opens)} {_EN} {_fmt_hour(closes)} daily"
    parts = []
    for first, last, (opens, closes) in groups:
        days = _DAY_NAMES[first] if first == last else f"{_DAY_NAMES[first]}{_EN}{_DAY_NAMES[last]}"
        parts.append(f"{days} {_fmt_hour(opens)} {_EN} {_fmt_hour(closes)}")
    return " · ".join(parts)


def closure_note(status: AmenityStatus | None) -> str | None:
    if status is not None and status.crowd_level == CrowdLevel.closed:
        return status.note or "Temporarily closed"
    return None


def blocked_hours(amenity: Amenity, day: date) -> dict[int, str]:
    out: dict[int, str] = {}
    for block in _rules(amenity).get("blocks") or []:
        if day.weekday() not in (block.get("days") or []):
            continue
        for hour in range(_hour_of(block.get("start"), 0), _hour_of(block.get("end"), 0)):
            out[hour] = str(block.get("label") or "Blocked")
    return out


def _occupancy(
    amenity: Amenity, day: date, bookings: list[AmenityBooking]
) -> dict[int, Occupied]:
    taken: dict[int, Occupied] = {}
    for booking in bookings:
        start = booking.starts_at.astimezone(IST)
        if start.date() == day:
            taken[start.hour] = Occupied("booked", None, booking.user_id, booking.id)
    for hour, label in blocked_hours(amenity, day).items():
        taken[hour] = Occupied("blocked", label)
    return taken


def _crowd_levels(amenity: Amenity, day: date) -> list[int]:
    crowd = _rules(amenity).get("crowd") or {}
    raw = crowd.get("weekend" if day.weekday() >= 5 else "weekday")
    if isinstance(raw, list) and len(raw) == 24:
        return [int(item) for item in raw]
    return [0] * 24


def _level_name(value: int) -> Level:
    return _LEVELS[min(max(value, 0), 2)]


def as_utc(value: datetime) -> datetime:
    """Treat naive input as IST wall time."""
    return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=IST).astimezone(UTC)


def day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time(0), tzinfo=IST).astimezone(UTC)
    return start, start + timedelta(days=1)


async def confirmed_bookings(
    db: AsyncSession,
    society_id: uuid.UUID,
    amenity_ids: list[uuid.UUID],
    start: datetime,
    end: datetime,
) -> list[AmenityBooking]:
    if not amenity_ids:
        return []
    rows = await db.scalars(
        select(AmenityBooking).where(
            AmenityBooking.society_id == society_id,
            AmenityBooking.amenity_id.in_(amenity_ids),
            AmenityBooking.status == AmenityBookingStatus.confirmed,
            AmenityBooking.starts_at >= start,
            AmenityBooking.starts_at < end,
        )
    )
    return list(rows)


def _closed_line(amenity: Amenity, local: datetime, opens: int) -> str:
    if local.hour < opens:
        return f"Closed · opens {_fmt_hour(opens)}"
    tomorrow_opens, _ = hours_for(amenity, local.date() + timedelta(days=1))
    return f"Closed · opens tomorrow at {_fmt_hour(tomorrow_opens)}"


def _bookable_live(occupied: dict[int, Occupied], hour: int, closes: int) -> tuple[Level, str]:
    if hour not in occupied:
        level: Level = "moderate" if hour + 1 in occupied and hour + 1 < closes else "quiet"
        return level, "Free now"
    next_free = next((h for h in range(hour + 1, closes) if h not in occupied), None)
    if next_free is None:
        return "busy", "Fully booked today"
    return "busy", f"Next free: {_slot_label(next_free)}"


def _walk_in_live(amenity: Amenity, local: datetime, closes: int) -> tuple[Level, str]:
    level = _level_name(_crowd_levels(amenity, local.date())[local.hour])
    if amenity.amenity_type in (AmenityType.gym, AmenityType.pool):
        people = max(1, round(amenity.capacity * _PEOPLE_SHARE[level]))
        return level, f"{people} people in now"
    return level, f"Open till {_fmt_hour(closes)}"


def _card(
    amenity: Amenity,
    status: AmenityStatus | None,
    today_bookings: list[AmenityBooking],
    now: datetime,
) -> AmenityOut:
    kind = kind_of(amenity)
    local = now.astimezone(IST)
    opens, closes = hours_for(amenity, local.date())
    closure = closure_note(status)
    level: Level
    if closure is not None:
        level, line = "closed", closure
    elif not opens <= local.hour < closes:
        level, line = "closed", _closed_line(amenity, local, opens)
    elif kind == "bookable":
        occupied = _occupancy(amenity, local.date(), today_bookings)
        level, line = _bookable_live(occupied, local.hour, closes)
    elif kind == "walk_in":
        level, line = _walk_in_live(amenity, local, closes)
    else:
        level, line = "quiet", f"Open till {_fmt_hour(closes)} · seats {amenity.capacity}"

    action, action_label = {
        "bookable": ("book", "Book"),
        "walk_in": ("view", "View"),
        "space": ("host", "Host an event here"),
    }[kind]
    return AmenityOut(
        id=str(amenity.id),
        name=amenity.name,
        emoji=_emoji(amenity.name),
        status=_UI_STATUS[level],  # type: ignore[arg-type]
        detail=line,
        kind=kind,
        category=category_of(amenity),
        image_url=f"/images/amenities/{_slug(amenity.name)}.jpg",
        status_label=level.capitalize(),
        action=action,  # type: ignore[arg-type]
        action_label=action_label,
    )


async def list_amenities(
    db: AsyncSession, society_id: uuid.UUID, *, now: datetime | None = None
) -> list[AmenityOut]:
    now = now or current_time()
    rows = (
        await db.execute(
            select(Amenity, AmenityStatus)
            .join(AmenityStatus, AmenityStatus.amenity_id == Amenity.id, isouter=True)
            .where(Amenity.society_id == society_id)
        )
    ).all()
    start, end = day_bounds(now.astimezone(IST).date())
    bookable_ids = [a.id for a, _ in rows if kind_of(a) == "bookable"]
    bookings = await confirmed_bookings(db, society_id, bookable_ids, start, end)
    cards = [
        _card(a, status, [b for b in bookings if b.amenity_id == a.id], now) for a, status in rows
    ]
    return sorted(cards, key=lambda c: (_CATEGORY_ORDER[c.category], c.name))


async def load_amenity(
    db: AsyncSession, member: CurrentMember, amenity_id: uuid.UUID
) -> tuple[Amenity, AmenityStatus | None]:
    row = (
        await db.execute(
            select(Amenity, AmenityStatus)
            .join(AmenityStatus, AmenityStatus.amenity_id == Amenity.id, isouter=True)
            .where(Amenity.id == amenity_id, Amenity.society_id == member.society_id)
        )
    ).first()
    if row is None:
        raise AppError("not_found", "Amenity not found.", 404)
    return row[0], row[1]


def resolve_day(amenity: Amenity, day: date | None, now: datetime) -> date:
    today = now.astimezone(IST).date()
    chosen = day or today
    window = _advance_days(amenity)
    if chosen < today or chosen > today + timedelta(days=window - 1):
        raise AppError("validation_error", f"Pick a day in the next {window} days.", 422)
    return chosen


async def get_amenity(
    db: AsyncSession, member: CurrentMember, amenity_id: uuid.UUID
) -> AmenityDetailOut:
    amenity, status = await load_amenity(db, member, amenity_id)
    now = current_time()
    start, end = day_bounds(now.astimezone(IST).date())
    bookings = await confirmed_bookings(db, member.society_id, [amenity.id], start, end)
    card = _card(amenity, status, bookings, now)
    bookable = kind_of(amenity) == "bookable"
    return AmenityDetailOut(
        **card.model_dump(),
        capacity=amenity.capacity,
        hours_label=hours_label(amenity),
        rules=_RULE_LINES.get(amenity.amenity_type, _RULE_LINES[AmenityType.other]),
        closure_note=closure_note(status),
        advance_days=_advance_days(amenity) if bookable else 0,
        max_hours_per_day=max_hours_per_day(amenity) if bookable else 0,
    )


def build_slots(
    amenity: Amenity,
    day: date,
    bookings: list[AmenityBooking],
    viewer_id: uuid.UUID,
    now: datetime,
    closure: str | None,
) -> list[SlotOut]:
    opens, closes = hours_for(amenity, day)
    occupied = _occupancy(amenity, day, bookings)
    slots: list[SlotOut] = []
    for hour in range(opens, closes):
        starts = datetime.combine(day, time(hour), tzinfo=IST).astimezone(UTC)
        slot = SlotOut(starts_at=starts, ends_at=starts + SLOT, state="free")
        taken = occupied.get(hour)
        if starts <= now:
            slot.state = "past"
        elif closure is not None:
            slot.state, slot.label = "blocked", closure
        elif taken is not None and taken.kind == "blocked":
            slot.state, slot.label = "blocked", taken.label
        elif taken is not None and taken.user_id == viewer_id:
            slot.state, slot.booking_id = "yours", str(taken.booking_id)
        elif taken is not None:
            slot.state = "booked"
        slots.append(slot)
    return slots


async def get_slots(
    db: AsyncSession, member: CurrentMember, amenity_id: uuid.UUID, day: date | None
) -> SlotsOut:
    amenity, status = await load_amenity(db, member, amenity_id)
    if kind_of(amenity) != "bookable":
        raise AppError("validation_error", "This amenity is not booked by slot.", 422)
    now = current_time()
    chosen = resolve_day(amenity, day, now)
    start, end = day_bounds(chosen)
    bookings = await confirmed_bookings(db, member.society_id, [amenity.id], start, end)
    slots = build_slots(amenity, chosen, bookings, member.user.id, now, closure_note(status))
    return SlotsOut(date=chosen, slots=slots)


def _crowd_summary(levels: list[CrowdHourOut], current: int | None) -> str:
    if current is not None:
        match = next(item for item in levels if item.hour == current)
        return f"Usually {match.level} now"
    peak = max((_LEVELS.index(item.level) for item in levels), default=0)
    if peak == 0:
        return "Usually quiet all day"
    first = next(item for item in levels if _LEVELS.index(item.level) == peak)
    return f"Usually busiest around {_fmt_hour(first.hour)}"


async def get_crowd(
    db: AsyncSession, member: CurrentMember, amenity_id: uuid.UUID, day: date | None
) -> CrowdOut:
    amenity, _ = await load_amenity(db, member, amenity_id)
    if kind_of(amenity) != "walk_in":
        raise AppError("validation_error", "Crowd levels are only for walk-in amenities.", 422)
    now = current_time()
    chosen = resolve_day(amenity, day, now)
    opens, closes = hours_for(amenity, chosen)
    levels = _crowd_levels(amenity, chosen)
    hours = [CrowdHourOut(hour=h, level=_level_name(levels[h])) for h in range(opens, closes)]
    local = now.astimezone(IST)
    current = local.hour if chosen == local.date() and opens <= local.hour < closes else None
    return CrowdOut(
        date=chosen, hours=hours, current_hour=current, summary=_crowd_summary(hours, current)
    )


async def set_closure(
    db: AsyncSession, member: CurrentMember, amenity_id: uuid.UUID, body: AmenityClosureIn
) -> AmenityDetailOut:
    if member.role not in (MembershipRole.committee.value, MembershipRole.admin.value):
        raise AppError("forbidden", "Only the committee can do this.", 403)
    amenity, status = await load_amenity(db, member, amenity_id)
    if status is None:
        status = AmenityStatus(amenity_id=amenity.id, society_id=amenity.society_id)
        db.add(status)
    status.crowd_level = CrowdLevel.closed if body.closed else CrowdLevel.quiet
    status.note = (body.note or "Closed for maintenance") if body.closed else None
    status.updated_by = member.user.id
    await db.commit()
    return await get_amenity(db, member, amenity_id)
