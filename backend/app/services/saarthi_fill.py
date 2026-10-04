"""Fill with Saarthi: model output cleaned against the forms' own limits, plus live hints.

Nothing is submitted here; the resident reviews the filled form and presses its normal button.
"""

import re
import time
from datetime import UTC, date, datetime, timedelta
from typing import Any

from pydantic.alias_generators import to_camel, to_snake
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.fill import fill_prompt, run_fill
from app.agents.llm import ChatModels
from app.agents.prompts import IST
from app.auth import CurrentMember
from app.core import rate_limit
from app.core.config import get_settings
from app.core.errors import AppError
from app.models.enums import (
    EventListTab,
    ListingCategory,
    ListingSort,
    LlmPurpose,
    TicketScope,
    TicketStatus,
)
from app.schemas.saarthi import FillHint, FillIn, FillOut
from app.services import amenities as amenity_service
from app.services import community, events, help_desk, llm_usage, marketplace
from app.services import home as home_service

EN = chr(0x2013)  # en dash for ranges
HALL_LAST_END = (22, 30)  # Handbook §11.7: hall events end by 10:30 PM.
_LOCAL = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")


def _text(value: Any, limit: int) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    return value.strip()[:limit]


def _clamp(value: Any, low: int, high: int) -> int | None:
    if not isinstance(value, int) or isinstance(value, bool):
        return None
    return max(low, min(high, value))


def _local(value: Any) -> datetime | None:
    if not isinstance(value, str) or not _LOCAL.match(value):
        return None
    try:
        return datetime.fromisoformat(value).replace(tzinfo=IST)
    except ValueError:
        return None


def _stamp(moment: datetime) -> str:
    return moment.astimezone(IST).strftime("%Y-%m-%dT%H:%M")


def _clock(moment: datetime) -> str:
    local = moment.astimezone(IST)
    return local.strftime("%I:%M %p").lstrip("0").replace(":00 ", " ")


# --- per-form cleaning -----------------------------------------------------------------------


def _clean_event(raw: dict[str, Any], now: datetime) -> dict[str, Any]:
    out: dict[str, Any] = {
        "title": _text(raw.get("title"), 200),
        "location_label": _text(raw.get("location_label"), 200),
        "description": _text(raw.get("description"), 5000),
        "category": raw.get("category"),
        "capacity": _clamp(raw.get("capacity"), 1, 2000),
        "guest_limit": _clamp(raw.get("guest_limit"), 0, 10),
        "what_to_bring": _text(raw.get("what_to_bring"), 500),
        "event_type": raw.get("event_type"),
        "invite_interest": _text(raw.get("invite_interest"), 40),
    }
    if raw.get("event_type") == "paid":
        out["price_inr"] = _clamp(raw.get("price_inr"), 50, 10_000)
    start, end = _local(raw.get("starts_at")), _local(raw.get("ends_at"))
    if start and start < now:
        # "Sunday at 6:30" said on Sunday afternoon means next Sunday.
        start += timedelta(days=7)
        end = end + timedelta(days=7) if end else None
    if start:
        out["starts_at"] = _stamp(start)
    if end and (not start or end > start):
        out["ends_at"] = _stamp(end)
    return out


def _clean_listing(raw: dict[str, Any]) -> dict[str, Any]:
    price = _clamp(raw.get("price"), 0, 10_000_000)
    out: dict[str, Any] = {
        "title": _text(raw.get("title"), 60),
        "category": raw.get("category"),
        "condition": raw.get("condition"),
        "negotiable": raw.get("negotiable") if isinstance(raw.get("negotiable"), bool) else None,
        "description": _text(raw.get("description"), 500),
        "pickup_note": _text(raw.get("pickup_note"), 120),
    }
    if raw.get("is_free") is True or price == 0:
        out["is_free"], out["price"] = True, ""
    elif price:
        out["is_free"], out["price"] = False, str(price)
    return out


def _clean_business(raw: dict[str, Any]) -> dict[str, Any]:
    offerings = [
        {
            "name": o["name"].strip()[:60],
            "price": str(o["price"]),
            "unit": o.get("unit", "each"),
            "note": "",
        }
        for o in raw.get("offerings") or []
        if isinstance(o.get("name"), str)
        and o["name"].strip()
        and isinstance(o.get("price"), int)
        and 0 < o["price"] <= 1_000_000
    ][:12]
    days = list(dict.fromkeys(raw.get("days") or []))
    return {
        "name": _text(raw.get("name"), 50),
        "category": raw.get("category"),
        "tagline": _text(raw.get("tagline"), 80),
        "about": _text(raw.get("about"), 600),
        "timings": _text(raw.get("timings"), 80),
        "days": days or None,
        "serves": raw.get("serves"),
        "offerings": offerings or None,
    }


def _clean_opening(raw: dict[str, Any], now: datetime) -> dict[str, Any]:
    rent = _clamp(raw.get("rent"), 0, 500_000)
    deposit = _clamp(raw.get("deposit"), 0, 5_000_000)
    floor = _clamp(raw.get("floor"), 0, 60)
    out: dict[str, Any] = {
        "kind": raw.get("kind"),
        "bhk": _clamp(raw.get("bhk"), 1, 4),
        "furnishing": raw.get("furnishing"),
        "rent": str(rent) if rent and rent >= 1000 else None,
        "deposit": str(deposit) if deposit else None,
        "floor": str(floor) if floor is not None else None,
        "preference": raw.get("preference"),
        "included": list(dict.fromkeys(raw.get("included") or [])) or None,
        "description": _text(raw.get("description"), 400),
    }
    when = raw.get("available_from")
    if isinstance(when, str):
        try:
            day = date.fromisoformat(when)
        except ValueError:
            day = None
        if day and now.astimezone(IST).date() < day <= now.astimezone(IST).date() + timedelta(
            days=365
        ):
            out["available_now"], out["available_from"] = False, day.isoformat()
    return out


def _clean_issue(raw: dict[str, Any], towers: list[str]) -> dict[str, Any]:
    tower = raw.get("tower")
    if isinstance(tower, str):
        wanted = tower.strip().lower()
        wanted = wanted if wanted.startswith("tower") else f"tower {wanted}"
        tower = next((t for t in towers if t.lower() == wanted), None)
    return {
        "category": raw.get("category"),
        "scope": raw.get("scope"),
        "tower": tower,
        "area_label": _text(raw.get("area_label"), 60),
        "title": _text(raw.get("title"), 80),
        "description": _text(raw.get("description"), 500),
        "urgency": raw.get("urgency"),
    }


def _clean_group(raw: dict[str, Any]) -> dict[str, Any]:
    tags = [t.strip()[:30] for t in raw.get("tags") or [] if isinstance(t, str) and t.strip()]
    return {
        "name": _text(raw.get("name"), 60),
        "emoji": _text(raw.get("emoji"), 8),
        "description": _text(raw.get("description"), 300),
        "visibility": raw.get("visibility"),
        "tags": tags[:8] or None,
    }


def _clean_post(raw: dict[str, Any], groups: list[str]) -> dict[str, Any]:
    group = raw.get("group")
    if isinstance(group, str):
        group = next((g for g in groups if g.lower() == group.strip().lower()), None)
    return {
        "body": _text(raw.get("body"), 1000),
        "post_type": raw.get("post_type"),
        "group": group,
    }


def _clean_feedback(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "topic": raw.get("topic"),
        "message": _text(raw.get("message"), 1000),
        "anonymous": raw.get("anonymous") if isinstance(raw.get("anonymous"), bool) else None,
    }


# --- context and hints -----------------------------------------------------------------------


async def _context(db: AsyncSession, member: CurrentMember, form: str) -> dict[str, Any]:
    tower, _ = await home_service.load_tower_flat(db, member.membership_id)
    context: dict[str, Any] = {"resident_tower": tower}
    if form == "event":
        cards = await amenity_service.list_amenities(db, member.society_id)
        context["society_spaces"] = [c.name for c in cards if c.kind == "space"] + [
            c.name for c in cards if c.name == "Clubhouse Terrace"
        ]
    if form == "issue":
        context["towers"] = [t.name for t in await help_desk.list_towers(db, member)]
    if form == "post":
        catalog = await community.catalog(db, member)
        context["my_groups"] = [g.name for g in catalog.groups if g.joined]
    return context


async def _event_hints(
    db: AsyncSession, member: CurrentMember, values: dict[str, Any], item_id: str | None
) -> list[FillHint]:
    location, start = values.get("location_label"), _local(values.get("starts_at"))
    if not location or not start:
        return []
    cards = await amenity_service.list_amenities(db, member.society_id)
    space = next((c for c in cards if c.name.lower() == str(location).lower()), None)
    if space is None:
        return []
    hints: list[FillHint] = []
    end = _local(values.get("ends_at")) or start + timedelta(hours=2)
    if space.kind == "space":
        last = start.replace(hour=HALL_LAST_END[0], minute=HALL_LAST_END[1])
        if end > last:
            end = last
            values["ends_at"] = _stamp(end)
            hints.append(
                FillHint(
                    kind="rule",
                    text=f"Events in the {space.name} must end by "
                    "10:30 PM, so I set the end to 10:30 PM.",
                )
            )
    clashes = []
    for tab in (EventListTab.upcoming, EventListTab.hosting):
        for e in await events.list_events(db, member, tab=tab):
            e_start = datetime.fromisoformat(e.starts_at)
            e_end = datetime.fromisoformat(e.ends_at) if e.ends_at else e_start
            overlaps = e_start < end and e_end > start
            if e.amenity_id == space.id and overlaps and e.id != item_id:
                clashes.append((e.title, e_start, e_end))
    if clashes:
        title, c_start, c_end = clashes[0]
        hints.append(
            FillHint(
                kind="clash",
                text=f'{space.name} already has "{title}" '
                f"{_clock(c_start)}{EN}{_clock(c_end)} that day. The next free start is "
                f"{_clock(max(c[2] for c in clashes))}.",
            )
        )
    return hints


async def _issue_hints(
    db: AsyncSession, member: CurrentMember, values: dict[str, Any], _item_id: str | None
) -> list[FillHint]:
    category = values.get("category")
    if not category or values.get("scope") == "my_flat":
        return []
    tower = values.get("tower") or (await home_service.load_tower_flat(db, member.membership_id))[0]
    similar = [
        i
        for i in await help_desk.list_issues(db, member)
        if i.scope == TicketScope.common_area
        and i.category.value == category
        and i.tower == tower
        and i.status in (TicketStatus.open, TicketStatus.in_progress)
    ]
    return [
        FillHint(
            kind="me_too",
            text=f'{i.number} "{i.title}" is already open with '
            f"{i.reporter_count} reporters. Add yourself instead of a new report?",
            issue_id=str(i.id),
            href=f"/help-desk/tickets/{i.id}",
        )
        for i in similar[:2]
    ]


_WORDS = re.compile(r"[a-z]{3,}")


async def _listing_hints(
    db: AsyncSession, member: CurrentMember, values: dict[str, Any], _item_id: str | None
) -> list[FillHint]:
    category = values.get("category")
    if not category:
        return []
    listings = await marketplace.browse(
        db,
        member,
        category=ListingCategory(category),
        free=False,
        query=None,
        sort=ListingSort.newest,
    )
    words = set(_WORDS.findall(str(values.get("title", "")).lower()))
    similar = [x for x in listings if words & set(_WORDS.findall(x.title.lower()))]
    priced = [x.price_inr for x in similar if not x.is_free and x.price_inr > 0]
    if len(priced) < 2:  # Too few close matches: the category's range still helps.
        priced = [x.price_inr for x in listings if not x.is_free and x.price_inr > 0]
    prices = sorted(priced)
    if len(prices) < 2:
        return []
    return [
        FillHint(
            kind="price",
            text=f"Similar items in the society are listed for ₹{prices[0]:,}{EN}₹{prices[-1]:,}.",
        )
    ]


# --- entry point -----------------------------------------------------------------------------


async def fill(
    db: AsyncSession, member: CurrentMember, body: FillIn, models: ChatModels
) -> FillOut:
    settings = get_settings()
    await rate_limit.enforce(
        f"saarthi_chat:{member.user.id}",
        [(settings.SAARTHI_CHAT_PER_10MIN, 600), (settings.SAARTHI_CHAT_PER_DAY, 86_400)],
        "You've asked Saarthi a lot in a short time. Try again in a few minutes.",
    )
    now = datetime.now(UTC)
    context = await _context(db, member, body.form)
    prompt = fill_prompt(body.form, context=context, current=body.current, now=now)
    started = time.perf_counter()
    result, named, outcome, error = await run_fill(models, body.form, prompt, body.text)
    llm_usage.record_call(
        db,
        society_id=member.society_id,
        user_id=member.user.id,
        purpose=LlmPurpose.fill,
        model=named.name,
        input_tokens=0,
        output_tokens=0,
        latency_ms=int((time.perf_counter() - started) * 1000),
        outcome=outcome,
        error_code=error,
        detail={"form": body.form, "edit": body.current is not None},
    )
    if result is None:
        await db.commit()
        raise AppError("saarthi_failed", "I couldn't fill that just now. Try again?", 503)

    raw = result.model_dump(exclude_none=True, exclude={"question"})
    cleaners = {
        "event": lambda: _clean_event(raw, now),
        "listing": lambda: _clean_listing(raw),
        "business": lambda: _clean_business(raw),
        "opening": lambda: _clean_opening(raw, now),
        "issue": lambda: _clean_issue(raw, context.get("towers", [])),
        "group": lambda: _clean_group(raw),
        "post": lambda: _clean_post(raw, context.get("my_groups", [])),
        "feedback": lambda: _clean_feedback(raw),
    }
    values = {k: v for k, v in cleaners[body.form]().items() if v is not None}
    if body.current is not None:
        # Hints judge the item as it will be: its current values with the change applied.
        values = {**{to_snake(k): v for k, v in body.current.items()}, **values}
    hint_makers = {"event": _event_hints, "issue": _issue_hints, "listing": _listing_hints}
    hints = (
        await hint_makers[body.form](db, member, values, body.item_id)
        if body.form in hint_makers
        else []
    )
    camel = {to_camel(k): v for k, v in values.items()}
    if body.current is not None:
        # Edit by instruction: only what actually changes.
        camel = {k: v for k, v in camel.items() if body.current.get(k) != v}
    await db.commit()
    return FillOut(values=camel, filled=list(camel), question=result.question, hints=hints)
