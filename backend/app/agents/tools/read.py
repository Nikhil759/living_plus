"""Read-only Saarthi tools. Each wraps an existing service and whitelists what it returns."""

from datetime import datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field

from app.agents.tools.base import (
    IST,
    NoArgs,
    ToolContext,
    ToolInputError,
    ToolResult,
    ToolSpec,
    ist_day,
    ist_time,
    match_name,
    parse_day,
)
from app.core.errors import AppError
from app.models.enums import (
    BusinessCategory,
    BusinessSort,
    EventCategory,
    EventListTab,
    EventType,
    ListingCategory,
    ListingSort,
    ListingTab,
    OpeningBudget,
    OpeningFurnishing,
    OpeningKind,
    OpeningSort,
    TicketStatus,
)
from app.schemas.event import EventListItemOut
from app.schemas.help_desk import IssueOut
from app.schemas.local_business import BusinessCardOut
from app.schemas.marketplace import ListingCardOut
from app.schemas.saarthi import CardChip, SaarthiCard
from app.services import amenities as amenity_service
from app.services import (
    amenity_bookings,
    community,
    events,
    flat_openings,
    help_desk,
    local_businesses,
    mappers,
    marketplace,
)
from app.services import home as home_service
from app.services import profile as profile_service

MAX_ITEMS = 8
EN = "\u2013"
ACTIVE = (TicketStatus.open, TicketStatus.in_progress)


def _count(n: int, noun: str) -> str:
    return f"{n} {noun}" if n == 1 else f"{n} {noun}s"


def _price(inr: int) -> str:
    return "Free" if inr == 0 else f"₹{inr:,}"


# --- notices ---------------------------------------------------------------------------------


async def recent_notices(ctx: ToolContext, _: NoArgs) -> ToolResult:
    digest = await mappers.map_digest(ctx.db, ctx.member.society_id, tower_name="your society")
    items = digest.items if digest else []
    return ToolResult(
        [{"notice": f"{i.lead} {i.body}"} for i in items],
        [
            SaarthiCard(
                kind="notice", title=i.lead.rstrip(":"), detail=i.body, href="/announcements"
            )
            for i in items[:3]
        ],
    )


# --- events ----------------------------------------------------------------------------------


def _event_row(e: EventListItemOut) -> dict[str, object]:
    return {
        "event": e.id,
        "title": e.title,
        "date": datetime.fromisoformat(e.starts_at).astimezone(IST).date().isoformat(),
        "when": f"{ist_day(e.starts_at)}, {ist_time(e.starts_at)}"
        + (f" to {ist_time(e.ends_at)}" if e.ends_at else ""),
        "where": e.location,
        "type": e.event_type.value,
        "category": e.category.value,
        "price": _price(e.price_inr),
        "spots_left": max(e.capacity - e.spots_taken, 0),
        "status": e.status.value,
        "you_are_going": e.viewer_going,
        "you_are_host": e.is_host,
    }


def _event_card(e: EventListItemOut) -> SaarthiCard:
    left = max(e.capacity - e.spots_taken, 0)
    return SaarthiCard(
        kind="event",
        title=e.title,
        subtitle=f"{ist_day(e.starts_at)} · {ist_time(e.starts_at)}",
        detail=f"{e.location} · {left} spots left" if left else f"{e.location} · Full",
        badge=_price(e.price_inr),
        href=e.href,
    )


class FindEventsArgs(BaseModel):
    """Upcoming society events between two dates (inclusive)."""

    date_from: str = Field("", description="YYYY-MM-DD; empty means today")
    date_to: str = Field("", description="YYYY-MM-DD; empty means 14 days after date_from")
    category: Literal[
        "", "sports", "fitness", "kids", "food", "music", "learning", "social", "other"
    ] = ""
    event_type: Literal["", "free", "paid", "society"] = ""
    text: str = Field("", description="Words to search in titles, e.g. 'yoga'")


async def find_events(ctx: ToolContext, args: FindEventsArgs) -> ToolResult:
    start = parse_day(args.date_from, ctx)
    end = parse_day(args.date_to, ctx) if args.date_to else start + timedelta(days=14)
    found = await events.list_events(
        ctx.db,
        ctx.member,
        tab=EventListTab.upcoming,
        event_type=EventType(args.event_type) if args.event_type else None,
        category=EventCategory(args.category) if args.category else None,
        q=args.text.strip() or None,
    )
    within = [
        e
        for e in found
        if start <= datetime.fromisoformat(e.starts_at).astimezone(IST).date() <= end
    ][:MAX_ITEMS]
    return ToolResult(
        {
            "from": start.isoformat(),
            "to": end.isoformat(),
            "events": [_event_row(e) for e in within],
        },
        [_event_card(e) for e in within],
    )


class MyEventsArgs(BaseModel):
    which: Literal["going", "hosting"] = "going"


async def my_events(ctx: ToolContext, args: MyEventsArgs) -> ToolResult:
    tab = EventListTab.going if args.which == "going" else EventListTab.hosting
    found = (await events.list_events(ctx.db, ctx.member, tab=tab))[:MAX_ITEMS]
    return ToolResult([_event_row(e) for e in found], [_event_card(e) for e in found])


class EventArgs(BaseModel):
    event: str = Field(description="The event id from another tool, or its title")


async def resolve_event(ctx: ToolContext, query: str) -> str:
    seen: dict[str, str] = {}
    for tab in (EventListTab.upcoming, EventListTab.going, EventListTab.hosting):
        for e in await events.list_events(ctx.db, ctx.member, tab=tab):
            seen[e.id] = e.title
    if query in seen:
        return query
    slug = match_name(query, seen)
    if slug is None:
        raise ToolInputError(f"No upcoming event matches '{query}'.")
    return slug


async def event_details(ctx: ToolContext, args: EventArgs) -> ToolResult:
    detail = await events.get_event_detail(
        ctx.db, ctx.member, await resolve_event(ctx, args.event)
    )
    row = _event_row(detail) | {
        "description": detail.description,
        "what_to_bring": detail.what_to_bring,
        "guest_limit": detail.guest_limit,
        "host": detail.host_profile.name,
        "stalls_open": detail.stalls_enabled,
        "waitlist": detail.waitlist_count,
    }
    # The attendee list is deliberately left out (privacy).
    return ToolResult(row, [_event_card(detail)])


# --- amenities -------------------------------------------------------------------------------


async def amenity_options(ctx: ToolContext) -> dict[str, str]:
    cards = await amenity_service.list_amenities(ctx.db, ctx.member.society_id, now=ctx.now)
    return {c.id: c.name for c in cards}


async def resolve_amenity(ctx: ToolContext, query: str) -> tuple[str, str]:
    options = await amenity_options(ctx)
    found = match_name(query, options)
    if found is None:
        raise ToolInputError(
            f"No amenity called '{query}'. Options: {', '.join(options.values())}."
        )
    return found, options[found]


async def amenity_status(ctx: ToolContext, _: NoArgs) -> ToolResult:
    cards = await amenity_service.list_amenities(ctx.db, ctx.member.society_id, now=ctx.now)
    return ToolResult(
        [
            {"amenity": c.name, "status": c.status_label, "detail": c.detail, "kind": c.kind}
            for c in cards
        ],
        [
            SaarthiCard(
                kind="amenity",
                title=c.name,
                detail=c.detail,
                badge=c.status_label,
                href=f"/amenities/{c.id}",
            )
            for c in cards[:MAX_ITEMS]
        ],
    )


class AmenityDayArgs(BaseModel):
    amenity: str = Field(description="Amenity name, e.g. 'Badminton 2' or 'tennis'")
    date: str = Field("", description="YYYY-MM-DD; empty means today")


class SlotArgs(AmenityDayArgs):
    from_time: str = Field(
        "", description="HH:MM, only slots starting at or after it (e.g. 17:00 for 'tonight')"
    )


def _minutes(value: str) -> int:
    if not value.strip():
        return 0
    try:
        hour, minute = (int(part) for part in value.strip().split(":"))
    except ValueError:
        raise ToolInputError(f"'{value}' is not a time; use HH:MM.") from None
    return hour * 60 + minute


async def free_slots(ctx: ToolContext, args: SlotArgs) -> ToolResult:
    amenity_id, name = await resolve_amenity(ctx, args.amenity)
    try:
        slots = await amenity_service.get_slots(
            ctx.db, ctx.member, amenity_id, parse_day(args.date, ctx)
        )
    except AppError as err:
        raise ToolInputError(f"{name}: {err.message}") from None
    after = _minutes(args.from_time)
    free = [
        s
        for s in slots.slots
        if s.state == "free"
        and s.starts_at.astimezone(IST).hour * 60 + s.starts_at.astimezone(IST).minute >= after
    ]
    yours = [s for s in slots.slots if s.state == "yours"]
    labels = [f"{ist_time(s.starts_at)}{EN}{ist_time(s.ends_at)}" for s in free]
    href = f"/amenities/{amenity_id}"
    return ToolResult(
        {
            "amenity": name,
            "date": slots.date.isoformat(),
            "free_slots": labels,
            "your_bookings": [ist_time(s.starts_at) for s in yours],
            "blocked": sorted({s.label for s in slots.slots if s.state == "blocked" and s.label}),
        },
        [
            SaarthiCard(
                kind="slots",
                title=name,
                subtitle=ist_day(slots.date),
                detail=_count(len(free), "free slot") if free else "No free slots",
                href=href,
                chips=[CardChip(label=label, href=href) for label in labels[:8]],
            )
        ],
    )


async def busy_hours(ctx: ToolContext, args: AmenityDayArgs) -> ToolResult:
    amenity_id, name = await resolve_amenity(ctx, args.amenity)
    try:
        crowd = await amenity_service.get_crowd(
            ctx.db, ctx.member, amenity_id, parse_day(args.date, ctx)
        )
    except AppError as err:
        raise ToolInputError(f"{name}: {err.message}") from None
    busy = [h.hour for h in crowd.hours if h.level == "busy"]
    quiet = [h.hour for h in crowd.hours if h.level == "quiet"]
    return ToolResult(
        {
            "amenity": name,
            "date": crowd.date.isoformat(),
            "summary": crowd.summary,
            "busy_hours": busy,
            "quiet_hours": quiet,
        },
        [
            SaarthiCard(
                kind="amenity", title=name, detail=crowd.summary, href=f"/amenities/{amenity_id}"
            )
        ],
    )


class SpaceDayArgs(BaseModel):
    space: str = Field(description="Community Hall, Amphitheatre or Clubhouse Terrace")
    date: str = Field("", description="YYYY-MM-DD; empty means today")


async def space_schedule(ctx: ToolContext, args: SpaceDayArgs) -> ToolResult:
    """Spaces are used by hosting events, so their schedule is the events booked there."""
    amenity_id, name = await resolve_amenity(ctx, args.space)
    day = parse_day(args.date, ctx)
    detail = await amenity_service.get_amenity(ctx.db, ctx.member, amenity_id)
    taken = []
    for tab in (EventListTab.upcoming, EventListTab.hosting):
        for e in await events.list_events(ctx.db, ctx.member, tab=tab):
            starts = datetime.fromisoformat(e.starts_at)
            if e.amenity_id == amenity_id and starts.astimezone(IST).date() == day:
                taken.append(
                    {
                        "event": e.title,
                        "from": ist_time(starts),
                        "to": ist_time(e.ends_at) if e.ends_at else None,
                        "status": e.status.value,
                    }
                )
    unique = list({(t["event"], t["from"]): t for t in taken}.values())
    return ToolResult(
        {
            "space": name,
            "date": day.isoformat(),
            "hours": detail.hours_label,
            "capacity": detail.capacity,
            "booked": unique,
            "closure": detail.closure_note,
        },
        [
            SaarthiCard(
                kind="amenity",
                title=name,
                subtitle=ist_day(day),
                detail=_count(len(unique), "event") + " that day" if unique else "Free all day",
                badge=f"{detail.capacity} people",
                href=f"/amenities/{amenity_id}",
            )
        ],
    )


async def my_bookings(ctx: ToolContext, _: NoArgs) -> ToolResult:
    bookings = [
        b for b in await amenity_bookings.my_bookings(ctx.db, ctx.member) if b.ends_at >= ctx.now
    ][:MAX_ITEMS]
    return ToolResult(
        [
            {
                "amenity": b.amenity_name,
                "day": ist_day(b.starts_at),
                "from": ist_time(b.starts_at),
                "to": ist_time(b.ends_at),
            }
            for b in bookings
        ],
        [
            SaarthiCard(
                kind="booking",
                title=b.amenity_name,
                subtitle=ist_day(b.starts_at),
                detail=f"{ist_time(b.starts_at)}{EN}{ist_time(b.ends_at)}",
                href=f"/amenities/{b.amenity_id}",
            )
            for b in bookings
        ],
    )


# --- help desk -------------------------------------------------------------------------------


def _issue_card(i: IssueOut) -> SaarthiCard:
    return SaarthiCard(
        kind="issue",
        title=i.title,
        subtitle=f"{i.number} · {i.tower}",
        detail=_count(i.reporter_count, "reporter"),
        badge=i.status.value.replace("_", " "),
        href=f"/help-desk/tickets/{i.id}",
    )


def _issue_row(i: IssueOut) -> dict[str, object]:
    latest = i.timeline[0].message if i.timeline else None
    return {
        "issue": str(i.id),
        "number": i.number,
        "title": i.title,
        "tower": i.tower,
        "area": i.area_label,
        "status": i.status.value,
        "urgency": i.urgency.value,
        "reporters": i.reporter_count,
        "latest_update": latest,
        "waiting_for_your_confirmation": i.awaiting_confirmation,
    }


async def my_issues(ctx: ToolContext, _: NoArgs) -> ToolResult:
    me = str(ctx.member.user.id)
    mine = [i for i in await help_desk.list_issues(ctx.db, ctx.member) if me in i.follower_ids]
    mine = mine[:MAX_ITEMS]
    return ToolResult([_issue_row(i) for i in mine], [_issue_card(i) for i in mine])


class TowerArgs(BaseModel):
    tower: str = Field("", description="e.g. 'Tower B'; empty means the resident's own tower")


async def open_issues_in_tower(ctx: ToolContext, args: TowerArgs) -> ToolResult:
    own, _ = await home_service.load_tower_flat(ctx.db, ctx.member.membership_id)
    wanted = (args.tower.strip() or own).lower()
    if not wanted.startswith("tower"):
        wanted = f"tower {wanted}"
    issues = [
        i
        for i in await help_desk.list_issues(ctx.db, ctx.member)
        if i.scope.value == "common_area" and i.status in ACTIVE and i.tower.lower() == wanted
    ][:MAX_ITEMS]
    return ToolResult([_issue_row(i) for i in issues], [_issue_card(i) for i in issues])


class VendorArgs(BaseModel):
    category: Literal[
        "",
        "housekeeping",
        "electrical",
        "plumbing",
        "carpentry",
        "pest_control",
        "appliance",
        "security",
        "other",
    ] = ""


async def find_vendors(ctx: ToolContext, args: VendorArgs) -> ToolResult:
    vendors = [
        v
        for v in await help_desk.list_vendors(ctx.db, ctx.member)
        if not args.category or v.category.value == args.category
    ][:MAX_ITEMS]
    return ToolResult(
        [
            {
                "vendor": v.name,
                "category": v.category.value,
                "note": v.note,
                "hours": v.hours_label,
                "phone": v.phone,
                "whatsapp": v.whatsapp,
            }
            for v in vendors
        ],
        [
            SaarthiCard(
                kind="vendor",
                title=v.name,
                subtitle=v.category.value.replace("_", " "),
                detail=v.note,
                href="/help-desk/directory",
            )
            for v in vendors
        ],
    )


# --- marketplace -----------------------------------------------------------------------------


class ListingSearchArgs(BaseModel):
    text: str = Field("", description="Words to search, e.g. 'cycle'")
    category: Literal["", "furniture", "electronics", "kids", "books", "sports", "home_kitchen"] = (
        ""
    )
    free_only: bool = False


def _listing_cards(
    listings: list[ListingCardOut],
) -> tuple[list[dict[str, object]], list[SaarthiCard]]:
    rows = [
        {
            "listing": str(x.id),
            "title": x.title,
            "price": _price(x.price_inr),
            "negotiable": x.negotiable,
            "condition": x.condition.value,
            "tower": x.tower,
            "status": x.status.value,
        }
        for x in listings
    ]
    cards = [
        SaarthiCard(
            kind="listing",
            title=x.title,
            subtitle=x.tower,
            detail=x.condition.value.replace("_", " "),
            badge=_price(x.price_inr),
            href=f"/marketplace/{x.id}",
        )
        for x in listings
    ]
    return rows, cards


async def search_listings(ctx: ToolContext, args: ListingSearchArgs) -> ToolResult:
    found = await marketplace.browse(
        ctx.db,
        ctx.member,
        category=ListingCategory(args.category) if args.category else None,
        free=args.free_only,
        query=args.text.strip() or None,
        sort=ListingSort.newest,
    )
    return ToolResult(*_listing_cards(found[:MAX_ITEMS]))


async def my_listings(ctx: ToolContext, _: NoArgs) -> ToolResult:
    found = await marketplace.my_listings(ctx.db, ctx.member, ListingTab.active)
    return ToolResult(*_listing_cards(found[:MAX_ITEMS]))


# --- local businesses ------------------------------------------------------------------------


class BusinessSearchArgs(BaseModel):
    text: str = Field("", description="Words to search, e.g. 'tiffin' or 'maths tuition'")
    category: Literal[
        "", "food", "tuition", "childcare", "pet_care", "art", "wellness", "home_services"
    ] = ""


async def _businesses(
    ctx: ToolContext, text: str = "", category: str = ""
) -> list[BusinessCardOut]:
    return await local_businesses.browse(
        ctx.db,
        ctx.member,
        category=BusinessCategory(category) if category else None,
        taking_orders=False,
        query=text.strip() or None,
        sort=BusinessSort.recommended,
    )


async def search_businesses(ctx: ToolContext, args: BusinessSearchArgs) -> ToolResult:
    found = (await _businesses(ctx, args.text, args.category))[:MAX_ITEMS]
    return ToolResult(
        [
            {
                "business": str(b.id),
                "name": b.name,
                "category": b.category.value,
                "tagline": b.tagline,
                "tower": b.tower,
                "availability": b.availability.value,
                "recommendations": b.recommendation_count,
            }
            for b in found
        ],
        [
            SaarthiCard(
                kind="business",
                title=b.name,
                subtitle=b.tagline,
                detail=_count(b.recommendation_count, "recommendation"),
                badge=b.availability.value.replace("_", " "),
                href=f"/local-businesses/{b.id}",
            )
            for b in found
        ],
    )


class BusinessArgs(BaseModel):
    business: str = Field(
        description="Business id from search_businesses, its name, or a word like 'tiffin'"
    )


async def business_details(ctx: ToolContext, args: BusinessArgs) -> ToolResult:
    every = await _businesses(ctx)
    options = {str(b.id): f"{b.name} {b.tagline} {b.category.value}" for b in every}
    chosen = args.business if args.business in options else match_name(args.business, options)
    if chosen is None:
        searched = await _businesses(ctx, args.business)
        chosen = str(searched[0].id) if searched else None
    if chosen is None:
        raise ToolInputError(f"No local business matches '{args.business}'.")
    b = await local_businesses.get_detail(
        ctx.db, ctx.member, next(x.id for x in every if str(x.id) == chosen)
    )
    latest = b.latest_update
    return ToolResult(
        # Contact details stay on the business page (private contact link), never in chat.
        {
            "name": b.name,
            "tagline": b.tagline,
            "about": b.about,
            "timings": b.timings,
            "days": [d.value for d in b.days],
            "availability": b.availability.value,
            "offerings": [
                {"name": o.name, "price": _price(o.price_inr), "unit": o.unit.value}
                for o in b.offerings
            ],
            "latest_update": {"text": latest.text, "posted": ist_day(latest.created_at)}
            if latest
            else None,
        },
        [
            SaarthiCard(
                kind="business",
                title=b.name,
                subtitle=b.tagline,
                detail=latest.text if latest else b.timings,
                badge=b.availability.value.replace("_", " "),
                href=f"/local-businesses/{b.id}",
            )
        ],
    )


# --- flat openings ---------------------------------------------------------------------------


class OpeningArgs(BaseModel):
    kind: Literal["", "room_available", "flatmate_needed", "full_flat"] = ""
    bhk: int = Field(0, ge=0, le=4, description="0 means any")
    budget: Literal["", "under_20k", "from_20k_to_40k", "over_40k"] = ""
    furnishing: Literal["", "furnished", "semi_furnished", "unfurnished"] = ""


async def search_openings(ctx: ToolContext, args: OpeningArgs) -> ToolResult:
    found = (
        await flat_openings.browse(
            ctx.db,
            ctx.member,
            kind=OpeningKind(args.kind) if args.kind else None,
            bhk=args.bhk or None,
            budget=OpeningBudget(args.budget) if args.budget else None,
            furnishing=OpeningFurnishing(args.furnishing) if args.furnishing else None,
            sort=OpeningSort.newest,
        )
    )[:MAX_ITEMS]
    return ToolResult(
        [
            {
                "opening": str(o.id),
                "title": o.title,
                "rent": f"₹{o.rent_inr:,}/month",
                "furnishing": o.furnishing.value,
                "available_from": o.available_from.isoformat() if o.available_from else "now",
                "preference": o.preference.value,
            }
            for o in found
        ],
        [
            SaarthiCard(
                kind="opening",
                title=o.title,
                subtitle=o.furnishing.value.replace("_", " "),
                badge=f"₹{o.rent_inr:,}",
                href=f"/flat-openings/{o.id}",
            )
            for o in found
        ],
    )


# --- community -------------------------------------------------------------------------------


async def my_groups(ctx: ToolContext, _: NoArgs) -> ToolResult:
    catalog = await community.catalog(ctx.db, ctx.member)
    shown = [g for g in catalog.groups if g.joined or g.suggested][:MAX_ITEMS]
    return ToolResult(
        [
            {
                "group": g.name,
                "members": g.member_count,
                "joined": g.joined,
                "suggested_for_you": g.suggested,
                "private": g.visibility == "private",
            }
            for g in catalog.groups
        ],
        [
            SaarthiCard(
                kind="group",
                title=f"{g.emoji} {g.name}",
                detail=g.description,
                badge="Joined" if g.joined else "Suggested",
                href=f"/community/groups/{g.id}",
            )
            for g in shown
        ],
    )


async def whatsapp_groups(ctx: ToolContext, _: NoArgs) -> ToolResult:
    catalog = await community.catalog(ctx.db, ctx.member)
    rows = []
    for w in catalog.whatsapp_groups:
        state = (
            "invite available"
            if w.invite_link
            else "requested"
            if w.pending_approval
            else ("not requested")
        )
        rows.append({"group": w.name, "topic": w.topic, "members": w.member_count, "you": state})
    return ToolResult(
        rows,
        [
            SaarthiCard(
                kind="group",
                title=w.name,
                detail=w.topic,
                badge=f"{w.member_count} members",
                href="/community",
            )
            for w in catalog.whatsapp_groups[:MAX_ITEMS]
        ],
    )


class PostsArgs(BaseModel):
    group: str = Field("", description="Group name; empty means the whole society feed")


async def recent_posts(ctx: ToolContext, args: PostsArgs) -> ToolResult:
    group_id = None
    if args.group.strip():
        catalog = await community.catalog(ctx.db, ctx.member)
        found = match_name(args.group, {str(g.id): g.name for g in catalog.groups})
        if found is None:
            raise ToolInputError(f"No group called '{args.group}'.")
        group_id = next(g.id for g in catalog.groups if str(g.id) == found)
    try:
        posts = (await community.feed(ctx.db, ctx.member, group_id))[:MAX_ITEMS]
    except AppError as err:
        raise ToolInputError(err.message) from None
    return ToolResult(
        [
            {
                "by": p.author_name,
                "type": p.post_type.value,
                "group": p.group_name,
                "posted": ist_day(p.posted_at),
                "text": p.body[:280],
            }
            for p in posts
        ],
        [
            SaarthiCard(
                kind="post",
                title=p.author_name,
                subtitle=p.group_name or "Society feed",
                detail=p.body[:140],
                href="/community",
            )
            for p in posts[:4]
        ],
    )


class InterestArgs(BaseModel):
    interest: str = Field(min_length=2, max_length=40, description="e.g. 'football'")


async def neighbours_with_interest(ctx: ToolContext, args: InterestArgs) -> ToolResult:
    catalog = await community.catalog(ctx.db, ctx.member)
    wanted = args.interest.strip().lower()
    visible = [n for n in catalog.neighbours if wanted in {i.lower() for i in n.interests}]
    total = await community.interest_count(ctx.db, ctx.member, wanted)
    return ToolResult(
        # Names only for residents who made their profile visible; everyone else is a number.
        {
            "interest": wanted,
            "residents_with_interest": total,
            "visible_profiles": [{"first_name": n.first_name, "tower": n.tower} for n in visible],
        },
        [
            SaarthiCard(kind="person", title=n.first_name, subtitle=n.tower, href="/community")
            for n in visible[:4]
        ],
    )


async def my_profile(ctx: ToolContext, _: NoArgs) -> ToolResult:
    me = await profile_service.build_resident_out(ctx.db, ctx.member)
    return ToolResult(
        {
            "name": me.name,
            "tower": me.tower,
            "flat": me.flat,
            "roles": me.roles,
            "interests": me.interests,
            "profile_visible": me.is_visible,
            "show_flat_number": me.show_flat,
        }
    )


READ_TOOLS: list[ToolSpec] = [
    ToolSpec(
        "recent_notices",
        "Latest society notices from the committee.",
        NoArgs,
        "Reading the latest notices…",
        recent_notices,
    ),
    ToolSpec(
        "find_events",
        "Upcoming society events in a date range, optionally filtered.",
        FindEventsArgs,
        "Looking at upcoming events…",
        find_events,
    ),
    ToolSpec(
        "my_events",
        "Events the resident is going to or hosting.",
        MyEventsArgs,
        "Checking your events…",
        my_events,
    ),
    ToolSpec(
        "event_details",
        "Details, spots left and status of one event.",
        EventArgs,
        "Opening the event…",
        event_details,
    ),
    ToolSpec(
        "amenity_status",
        "Live status and crowd of every amenity right now.",
        NoArgs,
        "Checking amenities…",
        amenity_status,
    ),
    ToolSpec(
        "free_slots",
        "Free booking slots of a court for a date, optionally from a time of day.",
        SlotArgs,
        "Checking court availability…",
        free_slots,
    ),
    ToolSpec(
        "busy_hours",
        "Usually busy and quiet hours of the gym, pool or café for a date.",
        AmenityDayArgs,
        "Checking how busy it gets…",
        busy_hours,
    ),
    ToolSpec(
        "space_schedule",
        "Events already booked in the Community Hall, Amphitheatre or "
        "Clubhouse Terrace on a date, plus opening hours and capacity.",
        SpaceDayArgs,
        "Checking the space…",
        space_schedule,
    ),
    ToolSpec(
        "my_bookings",
        "The resident's upcoming amenity bookings.",
        NoArgs,
        "Checking your bookings…",
        my_bookings,
    ),
    ToolSpec(
        "my_issues",
        "Help desk issues the resident reported or joined, with status.",
        NoArgs,
        "Checking your requests…",
        my_issues,
    ),
    ToolSpec(
        "open_issues_in_tower",
        "Open common-area issues in a tower.",
        TowerArgs,
        "Checking open issues…",
        open_issues_in_tower,
    ),
    ToolSpec(
        "find_vendors",
        "Society-approved vendors and service desks.",
        VendorArgs,
        "Looking up vendors…",
        find_vendors,
    ),
    ToolSpec(
        "search_listings",
        "Marketplace items for sale from residents.",
        ListingSearchArgs,
        "Searching the marketplace…",
        search_listings,
    ),
    ToolSpec(
        "my_listings",
        "The resident's own active marketplace listings.",
        NoArgs,
        "Checking your listings…",
        my_listings,
    ),
    ToolSpec(
        "search_businesses",
        "Local businesses run by residents (tiffin, tuition, ...).",
        BusinessSearchArgs,
        "Searching local businesses…",
        search_businesses,
    ),
    ToolSpec(
        "business_details",
        "One local business: offerings, timings and its latest update (e.g. today's menu).",
        BusinessArgs,
        "Opening the business…",
        business_details,
    ),
    ToolSpec(
        "search_openings",
        "Rooms, flatmate and full-flat openings in the society.",
        OpeningArgs,
        "Searching flat openings…",
        search_openings,
    ),
    ToolSpec(
        "my_groups",
        "Interest groups: joined and suggested for the resident.",
        NoArgs,
        "Checking groups…",
        my_groups,
    ),
    ToolSpec(
        "whatsapp_groups",
        "Society WhatsApp groups and the resident's request status.",
        NoArgs,
        "Checking WhatsApp groups…",
        whatsapp_groups,
    ),
    ToolSpec(
        "recent_posts",
        "Recent posts in the society feed or a group.",
        PostsArgs,
        "Reading recent posts…",
        recent_posts,
    ),
    ToolSpec(
        "neighbours_with_interest",
        "How many residents share an interest, and the first names of those with visible profiles.",
        InterestArgs,
        "Finding neighbours…",
        neighbours_with_interest,
    ),
    ToolSpec(
        "my_profile",
        "The resident's own profile: interests and privacy switches.",
        NoArgs,
        "Checking your profile…",
        my_profile,
    ),
]
