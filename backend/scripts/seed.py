"""Idempotent demo data for Prestige Meridian Park. Safe to re-run.

Usage (from backend/):
    uv run python scripts/seed.py

Users are created with synthetic supabase_uid values (seed:…). They do not sign in until
matching accounts exist in Supabase Auth; see README for optional SEED_DEMO_PASSWORD flow.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.models import (
    Amenity,
    MembershipInvite,
    AmenityBooking,
    AmenityBookingStatus,
    AmenityStatus,
    AmenityType,
    Comment,
    CrowdLevel,
    Event,
    EventCategory,
    EventStatus,
    EventTicket,
    EventTicketStatus,
    EventType,
    Flat,
    Group,
    GroupMember,
    GroupMemberRole,
    Membership,
    MembershipInviteStatus,
    MembershipRole,
    MembershipStatus,
    Post,
    Profile,
    Reaction,
    ReactionType,
    Society,
    SocietyPlan,
    StallApplication,
    StallApplicationStatus,
    Tower,
    User,
    WhatsappGroup,
)

SEED_NS = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
INVITE_CODE = "AANGAN50"

from app.services.invites import OPEN_INVITE_EMAIL

SOCIETY_DISPLAY_NAME = "Prestige Meridian Park"

# One-time guest codes — any Google email; share with demo visitors (re-seed resets consumed guest codes).
# Reusable for every demo / interviewer (see MASTER_INVITE_CODE in app/core/config.py).
MASTER_MEMBERSHIP_INVITE: tuple[str, str, MembershipRole] = (
    "LIVING-OPEN-50",
    "C-702",
    MembershipRole.tenant,
)

GUEST_MEMBERSHIP_INVITES: list[tuple[str, str, MembershipRole]] = [
    ("PMG-7H4K", "C-702", MembershipRole.tenant),
    ("PMG-9R2N", "A-101", MembershipRole.tenant),
    ("PMG-3W8P", "B-105", MembershipRole.tenant),
    ("PMG-5K1M", "C-104", MembershipRole.tenant),
    ("PMG-2L6T", "D-108", MembershipRole.tenant),
    ("PMG-8V4C", "A-106", MembershipRole.tenant),
    ("PMG-1D9X", "B-102", MembershipRole.tenant),
    ("PMG-6F3Q", "D-101", MembershipRole.tenant),
]

# Email-bound invites (testing / committee flows).
BOUND_MEMBERSHIP_INVITES: list[tuple[str, str, str, MembershipRole]] = [
    ("PMG-DEV-702", "demo@aangan.app", "C-702", MembershipRole.owner),
]

IST = timezone(timedelta(hours=5, minutes=30))

DEFAULT_OPEN_HOURS: dict[str, Any] = {
    "mon": {"open": "06:00", "close": "22:00"},
    "tue": {"open": "06:00", "close": "22:00"},
    "wed": {"open": "06:00", "close": "22:00"},
    "thu": {"open": "06:00", "close": "22:00"},
    "fri": {"open": "06:00", "close": "22:00"},
    "sat": {"open": "07:00", "close": "21:00"},
    "sun": {"open": "07:00", "close": "21:00"},
}

DEFAULT_RULES: dict[str, Any] = {
    "slot_minutes": 60,
    "max_hours_per_week": 6,
    "advance_days": 7,
    "requires_approval": False,
}

HALL_RULES: dict[str, Any] = {**DEFAULT_RULES, "requires_approval": True, "slot_minutes": 120}

RESIDENT_NAMES: list[tuple[str, str, list[str]]] = [
    ("Rohan Sharma", "rohan.sharma@example.com", ["FIFA", "gaming"]),
    ("Ananya Iyer", "ananya.iyer@example.com", ["dance", "salsa"]),
    ("Meera Kapoor", "meera.kapoor@example.com", ["yoga", "wellness"]),
    ("Kunal Mehra", "kunal.mehra@example.com", ["FIFA", "PlayStation"]),
    ("Amit Shah", "amit.shah@example.com", ["cricket", "FIFA"]),
    ("Sana Khan", "sana.khan@example.com", ["books", "cooking"]),
    ("Priya Nair", "priya.nair@example.com", ["running", "dogs"]),
    ("Vikram Singh", "vikram.singh@example.com", ["cricket", "cooking"]),
    ("Divya Reddy", "divya.reddy@example.com", ["yoga", "dance"]),
    ("Arjun Patel", "arjun.patel@example.com", ["cycling", "running"]),
    ("Neha Gupta", "neha.gupta@example.com", ["cooking", "books"]),
    ("Rahul Verma", "rahul.verma@example.com", ["FIFA", "cricket"]),
    ("Isha Joshi", "isha.joshi@example.com", ["dance", "music"]),
    ("Karan Malhotra", "karan.malhotra@example.com", ["dogs", "running"]),
    ("Pooja Desai", "pooja.desai@example.com", ["yoga", "books"]),
    ("Sanjay Rao", "sanjay.rao@example.com", ["cricket", "cooking"]),
    ("Tanya Bhatt", "tanya.bhatt@example.com", ["salsa", "music"]),
    ("Mohit Agarwal", "mohit.agarwal@example.com", ["gaming", "FIFA"]),
    ("Lakshmi Menon", "lakshmi.menon@example.com", ["cooking", "dogs"]),
    ("Aditi Chopra", "aditi.chopra@example.com", ["running", "yoga"]),
]


def sid(label: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NS, label)


def next_weekday_ist(weekday: int, hour: int, minute: int = 0) -> datetime:
    """JS-style weekday (0=Sun … 6=Sat) at a given IST clock time, returned in UTC."""
    now_ist = datetime.now(IST)
    # Map JS Sunday=0 to Python Monday=0 base: js_day -> python weekday
    py_target = (weekday - 1) % 7 if weekday != 0 else 6
    days_ahead = (py_target - now_ist.weekday()) % 7 or 7
    target = (now_ist + timedelta(days=days_ahead)).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )
    return target.astimezone(UTC)


async def get_or_create(
    session: AsyncSession, model: type[Any], obj_id: uuid.UUID, **fields: Any
) -> Any:
    row = await session.get(model, obj_id)
    if row is not None:
        return row
    row = model(id=obj_id, **fields)
    session.add(row)
    return row


async def seed_identity(session: AsyncSession) -> tuple[Society, dict[str, User], dict[str, Flat]]:
    society = await get_or_create(
        session,
        Society,
        sid("society.sector50"),
        name=SOCIETY_DISPLAY_NAME,
        city="Gurugram",
        address="Sector 43, Gurugram, Haryana",
        invite_code=INVITE_CODE,
        plan=SocietyPlan.free,
        settings={"timezone": "Asia/Kolkata"},
    )
    society.name = SOCIETY_DISPLAY_NAME
    society.city = "Gurugram"
    society.address = "Sector 43, Gurugram, Haryana"

    towers: dict[str, Tower] = {}
    flats: dict[str, Flat] = {}
    for letter in ("A", "B", "C", "D"):
        tower = await get_or_create(
            session,
            Tower,
            sid(f"tower.{letter}"),
            society_id=society.id,
            name=f"Tower {letter}",
        )
        towers[letter] = tower
        for n in range(101, 111):
            flat_no = str(n) if letter != "C" or n != 110 else "702"
            key = f"{letter}-{flat_no}"
            flat = await get_or_create(
                session,
                Flat,
                sid(f"flat.{key}"),
                society_id=society.id,
                tower_id=tower.id,
                flat_no=flat_no,
            )
            flats[key] = flat

    if "C-702" not in flats:
        flats["C-702"] = await get_or_create(
            session,
            Flat,
            sid("flat.C-702"),
            society_id=society.id,
            tower_id=towers["C"].id,
            flat_no="702",
        )

    users: dict[str, User] = {}

    demo = await get_or_create(
        session,
        User,
        sid("user.demo"),
        supabase_uid="seed:demo@aangan.app",
        email="demo@aangan.app",
        name="Nikhil",
        phone="+919876543210",
    )
    users["demo"] = demo

    committee = await get_or_create(
        session,
        User,
        sid("user.committee"),
        supabase_uid="seed:committee@aangan.app",
        email="committee@aangan.app",
        name="Committee Desk",
    )
    users["committee"] = committee

    for idx, (name, email, interests) in enumerate(RESIDENT_NAMES):
        key = f"resident.{idx}"
        user = await get_or_create(
            session,
            User,
            sid(f"user.{key}"),
            supabase_uid=f"seed:{email}",
            email=email,
            name=name,
        )
        users[key] = user
        tower_letter = ("A", "B", "C", "D")[idx % 4]
        flat_no = str(101 + (idx % 10))
        flat_key = f"{tower_letter}-{flat_no}"
        if flat_key not in flats:
            flat_key = next(k for k in flats if k.startswith(f"{tower_letter}-"))
        flat = flats[flat_key]

        membership = await session.get(Membership, sid(f"membership.{key}"))
        if membership is None:
            session.add(
                Membership(
                    id=sid(f"membership.{key}"),
                    user_id=user.id,
                    society_id=society.id,
                    flat_id=flat.id,
                    role=MembershipRole.owner if idx % 3 == 0 else MembershipRole.tenant,
                    status=MembershipStatus.approved,
                )
            )

        profile = await session.get(Profile, user.id)
        if profile is None:
            session.add(
                Profile(
                    user_id=user.id,
                    society_id=society.id,
                    bio=f"Resident at {SOCIETY_DISPLAY_NAME} · loves {', '.join(interests[:2])}.",
                    interests=interests,
                    is_visible=idx % 2 == 0,
                    show_flat=False,
                )
            )

    await _ensure_membership(
        session,
        sid("membership.demo"),
        demo.id,
        society.id,
        flats["C-702"].id,
        MembershipRole.owner,
    )
    await _ensure_membership(
        session,
        sid("membership.committee"),
        committee.id,
        society.id,
        None,
        MembershipRole.committee,
    )

    demo_profile = await session.get(Profile, demo.id)
    if demo_profile is None:
        session.add(
            Profile(
                user_id=demo.id,
                society_id=society.id,
                bio=f"Tower C rep · FIFA weekends · {SOCIETY_DISPLAY_NAME}.",
                interests=["FIFA", "running", "cricket", "tech"],
                is_visible=True,
                show_flat=False,
            )
        )

    return society, users, flats


async def _upsert_invite(
    session: AsyncSession,
    society: Society,
    flats: dict[str, Flat],
    code: str,
    email: str,
    flat_key: str,
    role: MembershipRole,
    *,
    reset_guest: bool,
) -> None:
    flat = flats.get(flat_key)
    if flat is None:
        return
    invite_id = sid(f"invite.{code}")
    invite = await session.get(MembershipInvite, invite_id)
    normalized_email = email.strip().lower() if email != OPEN_INVITE_EMAIL else OPEN_INVITE_EMAIL
    if invite is None:
        session.add(
            MembershipInvite(
                id=invite_id,
                society_id=society.id,
                flat_id=flat.id,
                email=normalized_email,
                role=role,
                code=code,
                status=MembershipInviteStatus.pending,
            )
        )
        return
    invite.flat_id = flat.id
    invite.role = role
    if normalized_email == OPEN_INVITE_EMAIL:
        if reset_guest or invite.status == MembershipInviteStatus.pending:
            invite.email = OPEN_INVITE_EMAIL
            invite.status = MembershipInviteStatus.pending
            invite.consumed_at = None
            invite.consumed_by_user_id = None
    elif invite.status == MembershipInviteStatus.pending:
        invite.email = normalized_email


async def seed_membership_invites(
    session: AsyncSession,
    society: Society,
    flats: dict[str, Flat],
) -> None:
    master_code, master_flat, master_role = MASTER_MEMBERSHIP_INVITE
    await _upsert_invite(
        session,
        society,
        flats,
        master_code,
        OPEN_INVITE_EMAIL,
        master_flat,
        master_role,
        reset_guest=True,
    )
    for code, flat_key, role in GUEST_MEMBERSHIP_INVITES:
        await _upsert_invite(
            session,
            society,
            flats,
            code,
            OPEN_INVITE_EMAIL,
            flat_key,
            role,
            reset_guest=True,
        )
    for code, email, flat_key, role in BOUND_MEMBERSHIP_INVITES:
        await _upsert_invite(
            session,
            society,
            flats,
            code,
            email,
            flat_key,
            role,
            reset_guest=False,
        )


async def _ensure_membership(
    session: AsyncSession,
    membership_id: uuid.UUID,
    user_id: uuid.UUID,
    society_id: uuid.UUID,
    flat_id: uuid.UUID | None,
    role: MembershipRole,
) -> None:
    if await session.get(Membership, membership_id) is None:
        session.add(
            Membership(
                id=membership_id,
                user_id=user_id,
                society_id=society_id,
                flat_id=flat_id,
                role=role,
                status=MembershipStatus.approved,
            )
        )


async def seed_amenities(session: AsyncSession, society: Society, users: dict[str, User]) -> None:
    specs: list[tuple[str, str, AmenityType, int, CrowdLevel, str, dict[str, Any] | None]] = [
        ("am-gym", "Gym", AmenityType.gym, 30, CrowdLevel.moderate, "Moderate · 6 active", None),
        ("am-pool", "Pool", AmenityType.pool, 20, CrowdLevel.quiet, "Quiet · 2 swimmers", None),
        (
            "am-badminton-1",
            "Badminton 1",
            AmenityType.court,
            4,
            CrowdLevel.busy,
            "Booked till 7:00 PM",
            None,
        ),
        ("am-badminton-2", "Badminton 2", AmenityType.court, 4, CrowdLevel.quiet, "Free now", None),
        ("am-tennis", "Tennis Court", AmenityType.court, 4, CrowdLevel.quiet, "Free now", None),
        (
            "am-hall",
            "Community Hall",
            AmenityType.hall,
            120,
            CrowdLevel.quiet,
            "Available",
            HALL_RULES,
        ),
        (
            "am-amphitheatre",
            "Amphitheatre",
            AmenityType.amphitheatre,
            200,
            CrowdLevel.closed,
            "Closed today",
            HALL_RULES,
        ),
        ("am-cafe", "Café Lounge", AmenityType.other, 40, CrowdLevel.moderate, "Open", None),
    ]
    for key, name, atype, capacity, crowd, note, rules in specs:
        amenity = await get_or_create(
            session,
            Amenity,
            sid(f"amenity.{key}"),
            society_id=society.id,
            name=name,
            amenity_type=atype,
            capacity=capacity,
            open_hours=DEFAULT_OPEN_HOURS,
            rules=rules or DEFAULT_RULES,
        )
        status = await session.get(AmenityStatus, amenity.id)
        if status is None:
            session.add(
                AmenityStatus(
                    amenity_id=amenity.id,
                    society_id=society.id,
                    crowd_level=crowd,
                    note=note,
                    updated_by=users["committee"].id,
                )
            )

    badminton = await session.get(Amenity, sid("amenity.am-badminton-1"))
    if badminton and await session.get(AmenityBooking, sid("booking.badminton.sample")) is None:
        start = datetime.now(UTC) + timedelta(hours=2)
        end = start + timedelta(hours=1)
        session.add(
            AmenityBooking(
                id=sid("booking.badminton.sample"),
                amenity_id=badminton.id,
                society_id=society.id,
                user_id=users["resident.0"].id,
                starts_at=start,
                ends_at=end,
                status=AmenityBookingStatus.confirmed,
            )
        )


async def seed_community(session: AsyncSession, society: Society, users: dict[str, User]) -> None:
    group_specs = [
        ("FIFA & Game Night", "Weekend console tournaments", ["FIFA", "gaming"], False),
        (
            "Resident Cyclists",
            "Early-morning rides on the expressway",
            ["cycling", "running"],
            False,
        ),
        ("Yoga Circle", "Sunrise flows on the terrace", ["yoga", "wellness"], False),
        ("Salsa Saturdays", "Community Hall workshops", ["dance", "salsa"], False),
        ("Book Club", "Tower-wise reading circles", ["books"], True),
        ("Dog Parents", "Park walks & vet referrals", ["dogs"], False),
    ]
    groups: list[Group] = []
    for idx, (name, desc, tags, private) in enumerate(group_specs):
        group = await get_or_create(
            session,
            Group,
            sid(f"group.{idx}"),
            society_id=society.id,
            name=name,
            description=desc,
            created_by=users["demo"].id,
            is_private=private,
            tags=tags,
        )
        groups.append(group)
        if await session.get(GroupMember, sid(f"group_member.{idx}.demo")) is None:
            session.add(
                GroupMember(
                    id=sid(f"group_member.{idx}.demo"),
                    group_id=group.id,
                    user_id=users["demo"].id,
                    role=GroupMemberRole.admin if idx == 0 else GroupMemberRole.member,
                )
            )

    wa_specs = [
        ("Tower C Updates", "Notices for Tower C residents", 142),
        ("FIFA Weekend Lobby", "Pick-up games & watch parties", 38),
        ("Society Marketplace", f"Buy/sell within {SOCIETY_DISPLAY_NAME}", 256),
    ]
    for idx, (name, topic, count) in enumerate(wa_specs):
        await get_or_create(
            session,
            WhatsappGroup,
            sid(f"whatsapp.{idx}"),
            society_id=society.id,
            name=name,
            topic=topic,
            member_count=count,
            invite_link=f"https://chat.whatsapp.com/demo-sector50-{idx}",
            admin_user_id=users["committee"].id,
        )

    announcements = [
        "**Water maintenance:** Tower B supply paused 2:00 PM – 4:00 PM today for motor replacement.",
        "**Diwali Mela 2024:** Food & handcraft stall slots close this Friday at 6:00 PM.",
        "**Central Mailroom:** 2 packages arrived for C-702 at Security Gate 1 desk.",
        "**Visitor parking:** Basement B2 slots 12–18 reserved for Diwali Mela setup this weekend.",
    ]
    for idx, body in enumerate(announcements):
        post_id = sid(f"post.announcement.{idx}")
        if await session.get(Post, post_id) is None:
            session.add(
                Post(
                    id=post_id,
                    society_id=society.id,
                    group_id=None,
                    author_id=users["committee"].id,
                    body=body,
                )
            )

    feed_posts = [
        (0, "Who's in for FIFA tonight? Bring your own controller 🎮"),
        (1, "6:15 AM roll-out from Main Gate — 25 km steady pace."),
        (2, "Terrace yoga moved to 6:45 AM due to dew."),
    ]
    for idx, (group_idx, body) in enumerate(feed_posts):
        post_id = sid(f"post.feed.{idx}")
        if await session.get(Post, post_id) is None:
            post = Post(
                id=post_id,
                society_id=society.id,
                group_id=groups[group_idx].id,
                author_id=users[f"resident.{idx}"].id,
                body=body,
            )
            session.add(post)
            session.add(
                Comment(
                    id=sid(f"comment.{idx}"),
                    post_id=post.id,
                    author_id=users["demo"].id,
                    body="Count me in!",
                )
            )
            session.add(
                Reaction(
                    id=sid(f"reaction.{idx}"),
                    post_id=post.id,
                    user_id=users["resident.1"].id,
                    reaction_type=ReactionType.celebrate,
                )
            )


async def seed_events(session: AsyncSession, society: Society, users: dict[str, User]) -> None:
    hall = await session.get(Amenity, sid("amenity.am-hall"))
    event_specs: list[dict[str, Any]] = [
        {
            "slug": "evt-fifa-night",
            "title": "FIFA 24 Tournament & Game Night",
            "type": EventType.free,
            "host": "resident.0",
            "location": "Club Lounge",
            "starts": next_weekday_ist(6, 21),
            "duration_h": 3,
            "price_paise": 0,
            "capacity": 24,
            "tags": ["FIFA", "gaming"],
            "category": EventCategory.sports,
            "cover_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
            "description": "Bring a controller and your best celebration. Rohan is running a knockout FIFA 24 tournament in the club lounge, then an open session for anyone who wants a kickabout. All ages, casual rules, and snacks on the sideboard.",
        },
        {
            "slug": "evt-salsa",
            "title": "Community Salsa & Bachata",
            "type": EventType.paid,
            "host": "resident.1",
            "location": "Community Hall",
            "amenity": hall,
            "starts": next_weekday_ist(0, 18),
            "duration_h": 2,
            "price_paise": 49900,
            "capacity": 40,
            "tags": ["dance", "salsa"],
            "category": EventCategory.music,
            "cover_url": "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=1200&q=80",
            "guest_limit": 1,
            "description": "Ananya and Studio 7 host a beginner-friendly salsa and bachata social in the community hall. No partner needed — they rotate, teach a short combination, then open the floor. One guest per resident is welcome.",
        },
        {
            "slug": "evt-expressway-ride",
            "title": "Morning Expressway 25km Ride",
            "type": EventType.free,
            "host": "resident.9",
            "location": "Main Gate",
            "starts": next_weekday_ist(6, 6, 30),
            "duration_h": 2,
            "price_paise": 0,
            "capacity": 30,
            "tags": ["cycling"],
            "category": EventCategory.fitness,
            "cover_url": "https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80",
            "description": "A steady 25 km out-and-back on the expressway service road, rolling out from the main gate at first light. The Resident Cyclists Club keeps a conversational pace and waits at the flyover. Lights and a helmet are a must.",
        },
        {
            "slug": "evt-terrace-yoga",
            "title": "Sunrise Yoga on the Terrace",
            "type": EventType.free,
            "host": "resident.2",
            "location": "Clubhouse Terrace",
            "starts": next_weekday_ist(0, 6, 30),
            "duration_h": 1,
            "price_paise": 0,
            "capacity": 20,
            "tags": ["yoga"],
            "category": EventCategory.fitness,
            "cover_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
            "what_to_bring": "A mat and water.",
            "description": "A gentle 60-minute flow on the clubhouse terrace as the sun comes up. All levels welcome; Meera brings a speaker and a few spare mats.",
        },
        {
            "slug": "evt-diwali-mela",
            "title": "Diwali Mela 2024",
            "type": EventType.society,
            "host": "committee",
            "location": "Amphitheatre & Central Lawn",
            "starts": datetime.now(UTC) + timedelta(days=21),
            "duration_h": 6,
            "price_paise": 0,
            "capacity": 500,
            "tags": ["society", "diwali"],
            "status": EventStatus.published,
            "category": EventCategory.social,
            "cover_url": "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=1200&q=80",
            "description": "Prestige Meridian Park's annual Diwali Mela takes over the amphitheatre and central lawn with food stalls, handicrafts, and games for the kids. Come in festive wear, stay for the lamps, and apply early if you want a stall.",
            "stalls_enabled": True,
            "stall_count": 10,
            "stall_fee_paise": 250000,
            "stall_categories": [
                {"name": "Chaat", "limit": 2},
                {"name": "Food stall", "limit": 4},
                {"name": "Handicraft", "limit": 3},
                {"name": "Games", "limit": 2},
            ],
            "stall_application_deadline": datetime.now(UTC) + timedelta(days=14),
        },
    ]

    for spec in event_specs:
        eid = sid(f"event.{spec['slug']}")
        starts = spec["starts"]
        ends = starts + timedelta(hours=spec["duration_h"])
        host = users[spec["host"]]
        event = await session.get(Event, eid)
        if event is None:
            event = Event(
                id=eid,
                society_id=society.id,
                public_slug=spec["slug"],
                event_type=spec["type"],
                title=spec["title"],
                description=spec.get("description") or f"Demo event seeded for {spec['title']}.",
                host_id=host.id,
                amenity_id=spec["amenity"].id if spec.get("amenity") else None,
                location_label=spec["location"],
                starts_at=starts,
                ends_at=ends,
                capacity=spec["capacity"],
                price_paise=spec["price_paise"],
                status=spec.get("status", EventStatus.published),
                tags=spec["tags"],
                category=spec.get("category", EventCategory.other),
                cover_url=spec.get("cover_url"),
                guest_limit=spec.get("guest_limit", 0),
                what_to_bring=spec.get("what_to_bring"),
            )
            session.add(event)
        else:
            event.title = spec["title"]
            event.location_label = spec["location"]
            event.capacity = spec["capacity"]
            event.tags = spec["tags"]
            event.category = spec.get("category", EventCategory.other)
            event.cover_url = spec.get("cover_url")
            event.guest_limit = spec.get("guest_limit", 0)
            event.what_to_bring = spec.get("what_to_bring")
            if spec.get("description"):
                event.description = spec["description"]

        event.stalls_enabled = spec.get("stalls_enabled", False)
        event.stall_count = spec.get("stall_count")
        event.stall_fee_paise = spec.get("stall_fee_paise", 0)
        event.stall_categories = spec.get("stall_categories") or []
        event.stall_application_deadline = spec.get("stall_application_deadline")

        for t_idx in range(3):
            attendee = users[f"resident.{t_idx}"]
            ticket_id = sid(f"ticket.{spec['slug']}.{t_idx}")
            if await session.get(EventTicket, ticket_id) is None:
                session.add(
                    EventTicket(
                        id=ticket_id,
                        event_id=event.id,
                        society_id=society.id,
                        user_id=attendee.id,
                        qty=1,
                        amount_paise=spec["price_paise"],
                        status=EventTicketStatus.confirmed,
                    )
                )

        if spec["slug"] == "evt-diwali-mela":
            for s_idx, (stall_type, fee) in enumerate(
                [("Food stall", 250000), ("Handicraft", 150000), ("Games", 100000)]
            ):
                stall_id = sid(f"stall.diwali.{s_idx}")
                if await session.get(StallApplication, stall_id) is None:
                    session.add(
                        StallApplication(
                            id=stall_id,
                            event_id=event.id,
                            society_id=society.id,
                            user_id=users[f"resident.{s_idx + 3}"].id,
                            stall_type=stall_type,
                            description=f"{stall_type} for Diwali Mela",
                            fee_paise=fee,
                            spot_no=str(s_idx + 1),
                            status=StallApplicationStatus.approved
                            if s_idx < 2
                            else StallApplicationStatus.pending,
                        )
                    )


async def run_seed() -> None:
    session_factory = get_sessionmaker()
    async with session_factory() as session:
        existing = await session.scalar(
            select(Society.id).where(Society.invite_code == INVITE_CODE)
        )
        society, users, flats = await seed_identity(session)
        await seed_membership_invites(session, society, flats)
        await seed_amenities(session, society, users)
        await seed_community(session, society, users)
        await seed_events(session, society, users)
        await session.commit()
        action = "Updated" if existing else "Created"
        print(f"{action} demo data for {society.name} (society code {INVITE_CODE}).")
        master_code, master_flat, master_role = MASTER_MEMBERSHIP_INVITE
        print(f"\nMaster demo code (reusable, any Google sign-in, never expires):")
        print(f"  {master_code:12}  {master_flat:8}  {master_role.value}")
        print("\nGuest demo codes (one use each, any Google sign-in):")
        for code, flat_key, role in GUEST_MEMBERSHIP_INVITES:
            print(f"  {code:12}  {flat_key:8}  {role.value}")
        print("\nRe-run seed to reset consumed guest codes for the next demo session.")


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
