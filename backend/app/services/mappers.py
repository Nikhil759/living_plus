import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Amenity,
    AmenityStatus,
    Event,
    EventTicket,
    EventTicketStatus,
    EventType,
    Flat,
    Membership,
    Post,
    Profile,
    Society,
    Tower,
    User,
)
from app.models.enums import CrowdLevel, EventStatus
from app.schemas.home import (
    AmenityOut,
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


def _emoji_for_amenity(name: str) -> str:
    lower = name.lower()
    for key, emoji in _AMENITY_EMOJI.items():
        if key in lower:
            return emoji
    return "📍"


def _ui_status_from_crowd(level: CrowdLevel | None, note: str | None) -> tuple[str, str]:
    if level is None:
        return "open", note or "Open"
    if level == CrowdLevel.closed:
        return "booked", note or "Closed"
    if level == CrowdLevel.busy:
        return "booked", note or "Busy"
    if level == CrowdLevel.moderate:
        return "moderate", note or "Moderate"
    if level == CrowdLevel.quiet:
        return "quiet", note or "Quiet"
    return "free", note or "Free now"


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


def event_to_home_event(
    event: Event,
    *,
    host_label: str,
    going_count: int,
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
        glyph=glyph,  # type: ignore[arg-type]
        going_count=going_count,
        action_label=action_label,
        action_tone=action_tone,  # type: ignore[arg-type]
        href=f"/events/{slug}",
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
        out.append(event_to_home_event(event, host_label=host, going_count=going))
    return out


async def map_amenities(db: AsyncSession, society_id: uuid.UUID) -> list[AmenityOut]:
    rows = await db.execute(
        select(Amenity, AmenityStatus)
        .join(AmenityStatus, AmenityStatus.amenity_id == Amenity.id, isouter=True)
        .where(Amenity.society_id == society_id)
        .order_by(Amenity.name)
    )
    items: list[AmenityOut] = []
    for amenity, status in rows.all():
        ui_status, detail = _ui_status_from_crowd(
            status.crowd_level if status else None,
            status.note if status else None,
        )
        items.append(
            AmenityOut(
                id=str(amenity.id),
                name=amenity.name,
                emoji=_emoji_for_amenity(amenity.name),
                status=ui_status,  # type: ignore[arg-type]
                detail=detail,
            )
        )
    return items


async def map_digest(
    db: AsyncSession, society_id: uuid.UUID, *, tower_name: str
) -> DigestOut | None:
    posts = (
        await db.execute(
            select(Post)
            .where(Post.society_id == society_id, Post.group_id.is_(None))
            .order_by(Post.created_at.desc())
            .limit(5)
        )
    ).scalars().all()
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
        select(func.count()).select_from(Post).where(
            Post.society_id == society_id, Post.group_id.is_(None)
        )
    )
    return DigestOut(
        title="Society Digest",
        subtitle=f"Live updates curated for {tower_name}",
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
        has_unread_notifications=False,
        bio=profile.bio if profile else None,
        interests=list(profile.interests) if profile else [],
        is_visible=profile.is_visible if profile else False,
        show_flat=profile.show_flat if profile else False,
    )


async def map_neighbour_match(
    db: AsyncSession,
    *,
    society_id: uuid.UUID,
    user_id: uuid.UUID,
    interests: list[str],
) -> NeighbourMatchOut | None:
    if not interests:
        return None
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
        return None
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
