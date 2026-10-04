"""Home "Today in your society": facts from existing services, summarised once per change.

The summary is cached per resident for the IST day under a fingerprint of the facts that matter
(notices, my bookings and events today, what's filling up, urgent issues in my tower), so it is
written once in the morning and again only when one of those changes, never on every page load.
"""

import hashlib
import json
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.llm import ChatModels
from app.agents.prompts import IST
from app.agents.today import summarise
from app.agents.tools.base import ist_day, ist_time
from app.auth import CurrentMember
from app.core import rate_limit
from app.core.cache import get_cache
from app.core.errors import AppError
from app.models.enums import (
    EventListTab,
    EventStatus,
    LlmPurpose,
    TicketScope,
    TicketStatus,
    TicketUrgency,
)
from app.schemas.event import EventListItemOut
from app.schemas.saarthi import TodayOut
from app.services import amenity_bookings, events, help_desk, llm_usage, mappers
from app.services import home as home_service
from app.services.community import resident_interests

QUIET_DAY = "A quiet day in the society. Ask me anything, or see what's on in Events."
FILLING_SHARE = 0.7  # an event counts as filling up at 70% of its places, or with a waitlist
URGENT_REPORTERS = 5
TODAY_PER_DAY = 30  # model calls per resident per day; cache hits don't count


def _is_today(iso: str, today: Any) -> bool:
    return datetime.fromisoformat(iso).astimezone(IST).date() == today


def _filling(e: EventListItemOut) -> bool:
    return e.waitlist_count > 0 or (e.capacity > 0 and e.spots_taken / e.capacity >= FILLING_SHARE)


def _matches(e: EventListItemOut, interests: set[str]) -> bool:
    words = {e.category.value, *(t.lower() for t in e.tags)}
    title = e.title.lower()
    return any(i in words or i in title for i in interests)


async def _facts(db: AsyncSession, member: CurrentMember, now: datetime) -> dict[str, Any]:
    today = now.astimezone(IST).date()
    tower, _ = await home_service.load_tower_flat(db, member.membership_id)
    digest = await mappers.map_digest(db, member.society_id, tower_name=tower)
    bookings = [
        b
        for b in await amenity_bookings.my_bookings(db, member)
        if _is_today(b.starts_at.isoformat(), today)
    ]
    upcoming = [
        e
        for e in await events.list_events(db, member, tab=EventListTab.upcoming)
        if e.status == EventStatus.published
        and datetime.fromisoformat(e.starts_at).astimezone(IST).date() <= today + timedelta(days=7)
    ]
    interests = await resident_interests(db, member)
    filling = [
        e
        for e in upcoming
        if _filling(e) and not (e.viewer_going or e.is_host) and _matches(e, interests)
    ]
    urgent = [
        i
        for i in await help_desk.list_issues(db, member)
        if i.scope == TicketScope.common_area
        and i.tower == tower
        and i.status in (TicketStatus.open, TicketStatus.in_progress)
        and (i.urgency == TicketUrgency.urgent or i.reporter_count >= URGENT_REPORTERS)
    ]
    return {
        "resident_tower": tower,
        "notices": [f"{i.lead} {i.body}" for i in (digest.items if digest else [])],
        "my_bookings_today": [
            {"amenity": b.amenity_name, "from": ist_time(b.starts_at), "to": ist_time(b.ends_at)}
            for b in bookings
        ],
        "my_events_today": [
            {
                "id": e.id,
                "title": e.title,
                "at": ist_time(e.starts_at),
                "where": e.location,
                "hosting": e.is_host,
            }
            for e in upcoming
            if (e.viewer_going or e.is_host) and _is_today(e.starts_at, today)
        ],
        "filling_up_for_your_interests": [
            {
                "id": e.id,
                "title": e.title,
                "when": f"{ist_day(e.starts_at)}, {ist_time(e.starts_at)}",
                "spots_left": max(e.capacity - e.spots_taken, 0),
                "waitlist": e.waitlist_count,
            }
            for e in filling[:3]
        ],
        "urgent_in_your_tower": [
            {
                "id": str(i.id),
                "number": i.number,
                "title": i.title,
                "status": i.status.value,
                "reporters": i.reporter_count,
            }
            for i in urgent[:3]
        ],
    }


def _fingerprint(facts: dict[str, Any]) -> str:
    """What should trigger a rewrite. Spot counts change all day, so only the event ids count."""
    stable = {
        **facts,
        "filling_up_for_your_interests": [e["id"] for e in facts["filling_up_for_your_interests"]],
        "urgent_in_your_tower": [(i["id"], i["status"]) for i in facts["urgent_in_your_tower"]],
    }
    return hashlib.sha256(json.dumps(stable, sort_keys=True).encode()).hexdigest()[:20]


def _seconds_to_midnight(now: datetime) -> int:
    local = now.astimezone(IST)
    midnight = (local + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(int((midnight - local).total_seconds()), 60)


def _has_news(facts: dict[str, Any]) -> bool:
    return any(v for k, v in facts.items() if k != "resident_tower")


async def today(db: AsyncSession, member: CurrentMember, models: ChatModels) -> TodayOut:
    now = datetime.now(UTC)
    facts = await _facts(db, member, now)
    day = now.astimezone(IST).date().isoformat()
    key = f"saarthi:today:{member.user.id}:{day}:{_fingerprint(facts)}"
    cache = get_cache()
    if (hit := await cache.get(key)) is not None:
        return TodayOut(summary=hit["summary"], generated_at=hit["generated_at"], cached=True)
    if not _has_news(facts):
        return TodayOut(summary=QUIET_DAY, generated_at=now.isoformat(), cached=False)

    await rate_limit.enforce(
        f"saarthi_today:{member.user.id}",
        [(TODAY_PER_DAY, 86_400)],
        "Saarthi has refreshed this a lot today. It will update again tomorrow.",
    )
    first_name = (member.user.name or "there").split()[0]
    started = time.perf_counter()
    run = await summarise(models, first_name, facts, now)
    llm_usage.record_call(
        db,
        society_id=member.society_id,
        user_id=member.user.id,
        purpose=LlmPurpose.summary,
        model=run.model.name,
        input_tokens=run.input_tokens,
        output_tokens=run.output_tokens,
        latency_ms=int((time.perf_counter() - started) * 1000),
        outcome=run.outcome,
        error_code=run.error,
        detail={
            "kind": "today",
            "facts": {k: len(v) for k, v in facts.items() if isinstance(v, list)},
        },
    )
    await db.commit()
    if run.value is None:
        raise AppError("saarthi_failed", "Saarthi couldn't write today's summary just now.", 503)
    out = {"summary": run.value, "generated_at": now.isoformat()}
    await cache.set(key, out, _seconds_to_midnight(now))
    return TodayOut(summary=run.value, generated_at=out["generated_at"], cached=False)
