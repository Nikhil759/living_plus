import re
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import Row, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Event,
    EventTicket,
    EventTicketStatus,
    EventType,
    EventWaitlist,
    Flat,
    Membership,
    Post,
    Profile,
    Society,
    StallApplication,
    Tower,
    User,
)
from app.models.enums import EventRecurrence, EventStatus, PostType
from app.schemas.event import (
    EventAttendeeFullOut,
    EventDetailOut,
    EventHostOut,
    EventListItemOut,
    StallApplicationOut,
    StallCategoryOut,
)
from app.schemas.home import (
    DigestItemOut,
    DigestOut,
    HomeEventOut,
    NeighbourMatchOut,
    PersonOut,
    ResidentOut,
)

_ANNOUNCEMENT_EMOJI = (
    ("water", "💧"),
    ("diwali", "✨"),
    ("mail", "📦"),
    ("package", "📦"),
    ("parking", "🅿️"),
    ("agm", "📋"),
    ("maintenance", "🔧"),
)

def _event_glyph(tags: list[str], title: str) -> str:
    blob = " ".join([*tags, title]).lower()
    if any(k in blob for k in ("fifa", "game", "console")):
        return "game"
    if any(k in blob for k in ("salsa", "dance", "music")):
        return "music"
    if any(k in blob for k in ("ride", "cycl", "expressway")):
        return "ride"
    if any(k in blob for k in ("yoga", "wellness", "terrace")):
        return "wellness"
    return "general"


def _host_icon(tags: list[str], title: str) -> str:
    blob = " ".join([*tags, title]).lower()
    if "club" in blob or "cycl" in blob:
        return "club"
    if any(k in blob for k in ("salsa", "diwali", "mela", "studio")):
        return "celebration"
    return "person"


def _action_for_event(event_type: EventType, price_paise: int) -> tuple[str, str]:
    if event_type == EventType.paid and price_paise > 0:
        return "Book Spot", "soft"
    return "RSVP", "solid"


def _parse_announcement_body(body: str) -> tuple[str, str]:
    match = re.match(r"^\*\*(.+?):\*\*\s*(.+)$", body, flags=re.DOTALL)
    if match:
        return match.group(1), match.group(2).strip()
    return "Notice", body.strip()


def _emoji_for_announcement(lead: str, body: str) -> str:
    blob = f"{lead} {body}".lower()
    for key, emoji in _ANNOUNCEMENT_EMOJI:
        if key in blob:
            return emoji
    return "📢"


def _first_name(name: str | None) -> str:
    if not name or not name.strip():
        return "Neighbour"
    return name.strip().split()[0]


def _ordinal(day: int) -> str:
    suffix = "th" if 10 <= day % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix}"


def _recurrence_label(event: Event) -> str | None:
    if event.recurrence == EventRecurrence.none:
        return None
    weekday = event.starts_at.strftime("%A")
    if event.recurrence == EventRecurrence.weekly:
        return f"Every {weekday}"
    if event.recurrence == EventRecurrence.biweekly:
        return f"Every two weeks on {weekday}"
    if event.recurrence == EventRecurrence.monthly:
        return f"Monthly on the {_ordinal(event.starts_at.day)}"
    return None


def event_to_home_event(
    event: Event,
    *,
    host_label: str,
    going_count: int,
    going: list[PersonOut] | None = None,
) -> HomeEventOut:
    slug = event.public_slug or str(event.id)
    price_inr = event.price_paise // 100
    glyph = _event_glyph(event.tags, event.title)
    host_icon = _host_icon(event.tags, event.title)
    action_label, action_tone = _action_for_event(event.event_type, event.price_paise)
    if "ride" in event.title.lower() or "cycl" in " ".join(event.tags).lower():
        action_label = "Join Ride"
        action_tone = "solid"
    return HomeEventOut(
        id=slug,
        title=event.title,
        host=host_label,
        host_icon=host_icon,  # type: ignore[arg-type]
        starts_at=event.starts_at.isoformat(),
        location=event.location_label or "On campus",
        price_inr=price_inr,
        image_url=event.cover_url,
        image_alt=event.title if event.cover_url else None,
        glyph=glyph,  # type: ignore[arg-type]
        going_count=going_count,
        going=going or [],
        action_label=action_label,
        action_tone=action_tone,  # type: ignore[arg-type]
        href=f"/events/{slug}",
    )


def event_to_list_item(
    event: Event,
    *,
    host_label: str,
    going_count: int,
    going: list[PersonOut],
    viewer_going: bool,
    is_host: bool,
    viewer_guest_count: int = 0,
    viewer_waitlisted: bool = False,
    waitlist_count: int = 0,
) -> EventListItemOut:
    card = event_to_home_event(event, host_label=host_label, going_count=going_count, going=going)
    return EventListItemOut(
        **card.model_dump(),
        event_type=event.event_type,
        status=event.status,
        category=event.category,
        ends_at=event.ends_at.isoformat() if event.ends_at else None,
        capacity=event.capacity,
        spots_taken=going_count,
        viewer_going=viewer_going,
        viewer_guest_count=viewer_guest_count,
        viewer_waitlisted=viewer_waitlisted,
        waitlist_count=waitlist_count,
        is_host=is_host,
        tags=list(event.tags or []),
        amenity_id=str(event.amenity_id) if event.amenity_id else None,
        change_summary=event.change_summary,
        cancel_reason=event.cancel_reason,
        invite_interest=event.invite_interest,
        series_id=str(event.series_id) if event.series_id else None,
        recurrence=event.recurrence,
    )


async def host_label_for(db: AsyncSession, host_id: uuid.UUID) -> str:
    host = await db.get(User, host_id)
    if host is None:
        return "A neighbour"
    row = await db.execute(
        select(Flat, Tower)
        .join(Membership, Membership.flat_id == Flat.id)
        .join(Tower, Flat.tower_id == Tower.id)
        .where(Membership.user_id == host_id)
        .limit(1)
    )
    m_row = row.first()
    if m_row:
        flat, tower = m_row
        return f"{host.name} ({tower.name}-{flat.flat_no}) hosting"
    return f"{host.name} hosting"


async def going_count_for(db: AsyncSession, event_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.coalesce(func.sum(EventTicket.qty), 0)).where(
                EventTicket.event_id == event_id,
                EventTicket.status == EventTicketStatus.confirmed,
            )
        )
        or 0
    )


async def public_going_for(
    db: AsyncSession, event_id: uuid.UUID, *, limit: int = 5
) -> list[PersonOut]:
    rows = (
        (
            await db.execute(
                select(User)
                .join(EventTicket, EventTicket.user_id == User.id)
                .join(Profile, Profile.user_id == User.id)
                .where(
                    EventTicket.event_id == event_id,
                    EventTicket.status == EventTicketStatus.confirmed,
                    Profile.is_visible.is_(True),
                )
                .order_by(EventTicket.created_at)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [
        PersonOut(id=str(user.id), name=_first_name(user.name), avatar_url=user.avatar_url)
        for user in rows
    ]


async def viewer_rsvp_qty(db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID) -> int:
    qty = await db.scalar(
        select(EventTicket.qty).where(
            EventTicket.event_id == event_id,
            EventTicket.user_id == user_id,
            EventTicket.status == EventTicketStatus.confirmed,
        )
    )
    return int(qty or 0)


async def viewer_going_for(db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return await viewer_rsvp_qty(db, event_id, user_id) > 0


async def viewer_waitlist_qty(db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID) -> int:
    qty = await db.scalar(
        select(EventWaitlist.qty).where(
            EventWaitlist.event_id == event_id,
            EventWaitlist.user_id == user_id,
        )
    )
    return int(qty or 0)


async def waitlist_count_for(db: AsyncSession, event_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count())
            .select_from(EventWaitlist)
            .where(EventWaitlist.event_id == event_id)
        )
        or 0
    )


async def hosted_count_for(db: AsyncSession, host_id: uuid.UUID, society_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count())
            .select_from(Event)
            .where(
                Event.host_id == host_id,
                Event.society_id == society_id,
                Event.status.in_((EventStatus.published, EventStatus.completed)),
            )
        )
        or 0
    )


async def host_profile_for(db: AsyncSession, event: Event) -> EventHostOut:
    host = await db.get(User, event.host_id)
    name = host.name if host and host.name else "A neighbour"
    avatar = host.avatar_url if host else None
    row = await db.execute(
        select(Tower.name)
        .join(Flat, Flat.tower_id == Tower.id)
        .join(Membership, Membership.flat_id == Flat.id)
        .where(Membership.user_id == event.host_id)
        .limit(1)
    )
    tower_name = row.scalar_one_or_none()
    hosted = await hosted_count_for(db, event.host_id, event.society_id)
    return EventHostOut(
        id=str(event.host_id),
        name=name,
        avatar_url=avatar,
        tower=tower_name,
        events_hosted=hosted,
    )


async def full_attendees_for(db: AsyncSession, event_id: uuid.UUID) -> list[EventAttendeeFullOut]:
    rows = (
        await db.execute(
            select(EventTicket, User, Tower.name)
            .join(User, User.id == EventTicket.user_id)
            .outerjoin(
                Membership,
                (Membership.user_id == User.id) & (Membership.society_id == EventTicket.society_id),
            )
            .outerjoin(Flat, Flat.id == Membership.flat_id)
            .outerjoin(Tower, Tower.id == Flat.tower_id)
            .where(
                EventTicket.event_id == event_id,
                EventTicket.status == EventTicketStatus.confirmed,
            )
            .order_by(EventTicket.created_at)
        )
    ).all()
    seen: set[uuid.UUID] = set()
    out: list[EventAttendeeFullOut] = []
    for ticket, user, tower_name in rows:
        if user.id in seen:
            continue
        seen.add(user.id)
        full = user.name or "Neighbour"
        out.append(
            EventAttendeeFullOut(
                id=str(user.id),
                name=_first_name(user.name),
                avatar_url=user.avatar_url,
                full_name=full,
                tower=tower_name,
                guest_count=max(ticket.qty - 1, 0),
                checked_in=ticket.checked_in_at is not None,
            )
        )
    return out


def parse_stall_categories(raw: list[object] | None) -> list[StallCategoryOut]:
    out: list[StallCategoryOut] = []
    for item in raw or []:
        if isinstance(item, str):
            name = item.strip()
            if name:
                out.append(StallCategoryOut(name=name))
            continue
        if isinstance(item, dict):
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            limit_raw = item.get("limit")
            limit = int(limit_raw) if isinstance(limit_raw, int) and limit_raw > 0 else None
            out.append(StallCategoryOut(name=name, limit=limit))
    return out


async def stall_applications_for(
    db: AsyncSession, event_id: uuid.UUID
) -> list[StallApplicationOut]:
    rows = (
        await db.execute(
            select(StallApplication, User).join(User, User.id == StallApplication.user_id).where(
                StallApplication.event_id == event_id
            ).order_by(StallApplication.created_at)
        )
    ).all()
    return [
        StallApplicationOut(
            id=str(application.id),
            stall_type=application.stall_type,
            description=application.description,
            fee_inr=application.fee_paise // 100,
            spot_no=application.spot_no,
            status=application.status,
            applicant_id=str(user.id),
            applicant_name=user.name or "Neighbour",
        )
        for application, user in rows
    ]


def event_to_detail(
    event: Event,
    *,
    list_item: EventListItemOut,
    host_profile: EventHostOut,
    attendees: list[EventAttendeeFullOut] | None,
    is_committee: bool,
    show_rejection: bool,
    viewer_stall: StallApplicationOut | None = None,
    stall_applications: list[StallApplicationOut] | None = None,
) -> EventDetailOut:
    return EventDetailOut(
        **list_item.model_dump(),
        description=event.description,
        what_to_bring=event.what_to_bring,
        guest_limit=event.guest_limit,
        audience=event.audience_type,
        recurrence_label=_recurrence_label(event),
        host_profile=host_profile,
        attendees=attendees,
        rejection_reason=event.rejection_reason if show_rejection else None,
        stalls_enabled=event.stalls_enabled,
        stall_count=event.stall_count,
        stall_fee_inr=event.stall_fee_paise // 100,
        stall_categories=parse_stall_categories(event.stall_categories),
        stall_application_deadline=(
            event.stall_application_deadline.isoformat()
            if event.stall_application_deadline
            else None
        ),
        viewer_stall=viewer_stall,
        stall_applications=stall_applications,
        is_committee=is_committee,
    )


async def map_events(db: AsyncSession, society_id: uuid.UUID) -> list[HomeEventOut]:
    result = await db.execute(
        select(Event)
        .where(
            Event.society_id == society_id,
            Event.status == EventStatus.published,
            Event.starts_at >= datetime.now(UTC),
        )
        .order_by(Event.starts_at)
        .limit(20)
    )
    out: list[HomeEventOut] = []
    for event in result.scalars().all():
        host = await host_label_for(db, event.host_id)
        going = await going_count_for(db, event.id)
        people = await public_going_for(db, event.id)
        out.append(event_to_home_event(event, host_label=host, going_count=going, going=people))
    return out


def _digest_summary(items: list[DigestItemOut]) -> str:
    """One-line home digest blurb from notices (placeholder until AI summarisation)."""
    snippets: list[str] = []
    for item in items[:3]:
        body = item.body.strip()
        if not body:
            continue
        clause = body.split(".")[0].strip().rstrip(".")
        if not clause:
            continue
        snippets.append(clause[0].lower() + clause[1:] if len(clause) > 1 else clause.lower())
    if not snippets:
        return ""
    if len(snippets) == 1:
        return f"{snippets[0]}."
    if len(snippets) == 2:
        return f"{snippets[0]}, and {snippets[1]}."
    return f"{snippets[0]}, {snippets[1]}, and {snippets[2]}."


async def map_digest(
    db: AsyncSession, society_id: uuid.UUID, *, tower_name: str
) -> DigestOut | None:
    posts = (
        (
            await db.execute(
                select(Post)
                .where(Post.society_id == society_id, Post.post_type == PostType.notice)
                .order_by(Post.created_at.desc())
                .limit(5)
            )
        )
        .scalars()
        .all()
    )
    if not posts:
        return None
    items: list[DigestItemOut] = []
    for post in posts:
        lead, body = _parse_announcement_body(post.body)
        items.append(
            DigestItemOut(
                id=str(post.id),
                emoji=_emoji_for_announcement(lead, body),
                lead=f"{lead}:",
                body=body,
            )
        )
    total = await db.scalar(
        select(func.count())
        .select_from(Post)
        .where(Post.society_id == society_id, Post.post_type == PostType.notice)
    )
    return DigestOut(
        title="Society Digest",
        subtitle=f"Live updates curated for {tower_name}",
        summary=_digest_summary(items),
        items=items,
        total_count=int(total or len(items)),
    )


def map_resident(
    user: User,
    society: Society,
    membership: Membership,
    *,
    tower_name: str,
    flat_no: str,
    profile: Profile | None = None,
    has_unread_notifications: bool = False,
) -> ResidentOut:
    role_label = membership.role.value.replace("_", " ").title()
    if membership.role.value == "committee":
        role_label = "Committee"
    roles = [f"{tower_name} {role_label}"]

    return ResidentOut(
        id=str(user.id),
        name=user.name or user.email.split("@")[0].title(),
        avatar_url=user.avatar_url,
        society=society.name,
        tower=tower_name,
        flat=flat_no,
        roles=roles,
        has_unread_notifications=has_unread_notifications,
        bio=profile.bio if profile else None,
        interests=list(profile.interests) if profile else [],
        is_visible=profile.is_visible if profile else False,
        show_flat=profile.show_flat if profile else False,
    )


def _discover_neighbours(profiles: Sequence[Row[tuple[Profile, User]]]) -> NeighbourMatchOut | None:
    """No shared interests yet: invite the resident to add theirs instead of hiding the card."""
    sharing = [person for profile, person in profiles if profile.interests]
    if not sharing:
        return None
    return NeighbourMatchOut(
        label="Find people like you",
        title="Find people like you",
        description=f"{len(sharing)} neighbours have shared their interests. "
        "Add yours to meet the ones you have in common.",
        people=[
            PersonOut(id=str(p.id), name=p.name or "Neighbour", avatar_url=p.avatar_url)
            for p in sharing[:3]
        ],
        total_count=len(sharing),
        active_summary="",
        action_label="Add your interests",
        action_href="/profile",
    )


async def map_neighbour_match(
    db: AsyncSession,
    *,
    society_id: uuid.UUID,
    user_id: uuid.UUID,
    interests: list[str],
) -> NeighbourMatchOut | None:
    profiles = (
        await db.execute(
            select(Profile, User)
            .join(User, Profile.user_id == User.id)
            .where(
                Profile.society_id == society_id,
                Profile.user_id != user_id,
                Profile.is_visible.is_(True),
            )
        )
    ).all()
    scored: list[tuple[int, Profile, User]] = []
    interest_set = {i.lower() for i in interests}
    for profile, person in profiles:
        overlap = interest_set.intersection({i.lower() for i in profile.interests})
        if overlap:
            scored.append((len(overlap), profile, person))
    if not scored:
        return _discover_neighbours(profiles)
    scored.sort(key=lambda row: row[0], reverse=True)
    top = scored[:3]
    total = len(scored)
    sample_interest = next(
        iter(interest_set.intersection({i.lower() for i in top[0][1].interests}))
    )
    names = [p.name or "Neighbour" for _, _, p in top]
    if len(names) >= 2:
        summary = f"{names[0]}, {names[1]} & others active today"
    else:
        summary = f"{names[0]} active today"
    return NeighbourMatchOut(
        label="Interest Match",
        title="Neighbours like you",
        description=f"{total} neighbours also into {sample_interest.title()}.",
        people=[
            PersonOut(id=str(p.id), name=p.name or "Neighbour", avatar_url=p.avatar_url)
            for _, _, p in top
        ],
        total_count=total,
        active_summary=summary,
        action_label="Start a group",
    )
