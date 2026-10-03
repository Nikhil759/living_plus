"""Idempotent demo data for Prestige Meridian Park. Safe to re-run.

Usage (from backend/):
    uv run python scripts/seed.py

Users are created with synthetic supabase_uid values (seed:…). They do not sign in until
matching accounts exist in Supabase Auth; see README for optional SEED_DEMO_PASSWORD flow.
"""

from __future__ import annotations

import asyncio
import random
import uuid
from datetime import UTC, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from business_seed_data import BUSINESSES, DEMO_FOLLOWS, DEMO_RECOMMENDS, SeedBusiness
from opening_seed_data import OPENINGS
from app.models import (
    FlatOpening,
    OpeningStatus,
    Amenity,
    BusinessFollow,
    BusinessRecommendation,
    BusinessReviewStatus,
    BusinessUpdate,
    LocalBusiness,
    Notification,
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
    ListingCategory,
    ListingCondition,
    ListingContactMethod,
    ListingStatus,
    MarketplaceListing,
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

from app.services.amenities import blocked_hours
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

_DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def hours(open_at: str, close_at: str) -> dict[str, Any]:
    return {day: {"open": open_at, "close": close_at} for day in _DAYS}


def crowd_pattern(busy: list[tuple[int, int]], moderate: list[tuple[int, int]]) -> list[int]:
    """24 hourly levels: 0 quiet, 1 moderate, 2 busy. Busy windows win over moderate."""
    levels = [0] * 24
    for start, end in moderate:
        levels[start:end] = [1] * (end - start)
    for start, end in busy:
        levels[start:end] = [2] * (end - start)
    return levels


COURT_RULES: dict[str, Any] = {"advance_days": 7, "max_hours_per_day": 2, "slot_minutes": 60}

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


def booking_odds(hour: int, weekend: bool) -> float:
    """Chance a court slot is already taken: evenings fullest, midday emptiest."""
    if 18 <= hour <= 20:
        return 0.92 if weekend else 0.85
    if hour == 21:
        return 0.5
    if 6 <= hour <= 8:
        return 0.55 if weekend else 0.4
    if 9 <= hour <= 10:
        return 0.35 if weekend else 0.2
    if 11 <= hour <= 16:
        return 0.25 if weekend else 0.12
    return 0.3


async def seed_court_bookings(
    session: AsyncSession, society: Society, users: dict[str, User], courts: list[tuple[str, Amenity]]
) -> None:
    """Rebuild the next 7 days of court bookings so the schedule is always current."""
    await session.execute(delete(AmenityBooking).where(AmenityBooking.society_id == society.id))
    now_ist = datetime.now(IST)
    bookers = [user for key, user in users.items() if key.startswith("resident.")]
    for key, amenity in courts:
        for offset in range(7):
            day = now_ist.date() + timedelta(days=offset)
            blocked = blocked_hours(amenity, day)
            per_user: dict[uuid.UUID, int] = {}
            for hour in range(6, 22):
                is_demo_slot = key == "am-badminton-2" and offset == 1 and hour == 7
                if not is_demo_slot and (hour in blocked or (offset == 0 and hour <= now_ist.hour)):
                    continue
                rng = random.Random(f"{key}:{day}:{hour}")
                if is_demo_slot:
                    booker = users["demo"]
                elif rng.random() < booking_odds(hour, day.weekday() >= 5):
                    eligible = [u for u in bookers if per_user.get(u.id, 0) < 2]
                    booker = rng.choice(eligible)
                else:
                    continue
                per_user[booker.id] = per_user.get(booker.id, 0) + 1
                starts = datetime.combine(day, time(hour), tzinfo=IST).astimezone(UTC)
                session.add(
                    AmenityBooking(
                        id=sid(f"booking.{key}.{day}.{hour}"),
                        amenity_id=amenity.id,
                        society_id=society.id,
                        user_id=booker.id,
                        starts_at=starts,
                        ends_at=starts + timedelta(hours=1),
                        status=AmenityBookingStatus.confirmed,
                    )
                )


async def seed_amenities(session: AsyncSession, society: Society, users: dict[str, User]) -> None:
    badminton_1_blocks = [
        {"label": "Kids coaching", "days": [1, 3], "start": "17:00", "end": "18:00"}
    ]
    tennis_blocks = [
        {"label": "Court cleaning", "days": list(range(7)), "start": "14:00", "end": "15:00"}
    ]
    specs: list[tuple[str, str, AmenityType, int, dict[str, Any], dict[str, Any]]] = [
        (
            "am-badminton-1",
            "Badminton 1",
            AmenityType.court,
            4,
            hours("06:00", "22:00"),
            {**COURT_RULES, "blocks": badminton_1_blocks},
        ),
        (
            "am-badminton-2",
            "Badminton 2",
            AmenityType.court,
            4,
            hours("06:00", "22:00"),
            COURT_RULES,
        ),
        (
            "am-tennis",
            "Tennis Court",
            AmenityType.court,
            4,
            hours("06:00", "22:00"),
            {**COURT_RULES, "blocks": tennis_blocks},
        ),
        (
            "am-gym",
            "Gym",
            AmenityType.gym,
            30,
            hours("06:00", "22:00"),
            {
                "crowd": {
                    "weekday": crowd_pattern([(6, 8), (19, 21)], [(8, 10), (17, 19), (21, 22)]),
                    "weekend": crowd_pattern([(7, 9), (18, 20)], [(9, 12), (17, 18), (20, 21)]),
                }
            },
        ),
        (
            "am-pool",
            "Pool",
            AmenityType.pool,
            20,
            hours("06:00", "21:00"),
            {
                "crowd": {
                    "weekday": crowd_pattern([], [(6, 8), (17, 19)]),
                    "weekend": crowd_pattern([(7, 10), (17, 19)], [(10, 12), (16, 17), (19, 20)]),
                }
            },
        ),
        (
            "am-cafe",
            "Café Lounge",
            AmenityType.other,
            40,
            hours("08:00", "22:00"),
            {
                "crowd": {
                    "weekday": crowd_pattern([(17, 20)], [(8, 10), (16, 17), (20, 22)]),
                    "weekend": crowd_pattern([(17, 20)], [(10, 12), (16, 17), (20, 22)]),
                }
            },
        ),
        (
            "am-hall",
            "Community Hall",
            AmenityType.hall,
            120,
            hours("08:00", "22:00"),
            {"requires_approval": True},
        ),
        (
            "am-amphitheatre",
            "Amphitheatre",
            AmenityType.amphitheatre,
            200,
            hours("08:00", "22:00"),
            {"requires_approval": True},
        ),
    ]
    courts: list[tuple[str, Amenity]] = []
    for key, name, atype, capacity, open_hours, rules in specs:
        amenity = await get_or_create(
            session,
            Amenity,
            sid(f"amenity.{key}"),
            society_id=society.id,
            name=name,
            amenity_type=atype,
            capacity=capacity,
            open_hours=open_hours,
            rules=rules,
        )
        # Re-seeding refreshes config and lifts any closure, so the demo always starts open.
        amenity.name, amenity.amenity_type, amenity.capacity = name, atype, capacity
        amenity.open_hours, amenity.rules = open_hours, rules
        status = await session.get(AmenityStatus, amenity.id)
        if status is None:
            status = AmenityStatus(
                amenity_id=amenity.id, society_id=society.id, updated_by=users["committee"].id
            )
            session.add(status)
        status.crowd_level, status.note = CrowdLevel.quiet, None
        if atype == AmenityType.court:
            courts.append((key, amenity))
    await seed_court_bookings(session, society, users, courts)


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


# (key, seller key, title, category, condition, price, negotiable, status, days ago, contact,
#  photos, description)
Cat, Cond, St, Via = ListingCategory, ListingCondition, ListingStatus, ListingContactMethod
MARKETPLACE_SEED: list[tuple[Any, ...]] = [
    ("desk", "resident.6", "IKEA Micke study desk (white)", Cat.furniture, Cond.good, 4500, True,
     St.available, 3, Via.whatsapp, ["study-desk", "study-desk-2"],
     "Used for 2 years, minor scratch on the edge. Includes the drawer. Easy to dismantle."),
    ("stroller", "resident.1", "Chicco LiteWay stroller", Cat.kids, Cond.like_new, 3200, False,
     St.reserved, 4, Via.whatsapp, ["stroller", "stroller-2"],
     "Barely used. Folds compactly, rain cover and cup holder included."),
    ("ps5", "resident.3", "PS5 games bundle (FIFA 24 + GT7)", Cat.electronics, Cond.like_new,
     2800, False, St.available, 1, Via.whatsapp, ["ps5-games"],
     "Both discs with cases, no scratches. Happy to meet at the club lounge."),
    ("cycle", "resident.9", "Hero Sprint 26T hybrid cycle", Cat.sports, Cond.good, 5500, True,
     St.available, 6, Via.call, ["hybrid-cycle"],
     "21-speed, serviced last month. New tyres. Ideal for the society loop and commutes."),
    ("books", "resident.5", "Kids' picture book set (8 books)", Cat.books, Cond.good, 0, False,
     St.available, 2, Via.whatsapp, ["kids-books"],
     "Hardcover animal picture books, ages 2 to 6. Free to a good home."),
    ("yoga", "resident.2", "Yoga mat, 6mm", Cat.sports, Cond.like_new, 400, False,
     St.available, 5, Via.whatsapp, ["yoga-mat"],
     "Non-slip, used a handful of times. Cleaned and rolled."),
    ("microwave", "demo", "Samsung 28L microwave oven", Cat.home_kitchen, Cond.good, 2000, True,
     St.available, 2, Via.whatsapp, ["microwave"],
     "Works perfectly, selling because we upgraded. Turntable included."),
    ("airfryer", "demo", "Philips air fryer 4.1L", Cat.home_kitchen, Cond.like_new, 2500, False,
     St.sold, 9, Via.whatsapp, ["air-fryer"], "Used only a few times. Sold to a neighbour."),
    ("bookcase", "resident.7", "Oak finish 5-shelf bookcase", Cat.furniture, Cond.fair, 1800,
     True, St.reserved, 7, Via.call, ["bookcase"],
     "Sturdy, a few marks on the side panel. Needs two people to carry."),
    ("lego", "resident.8", "Building bricks box with storage bin", Cat.kids, Cond.good, 900,
     False, St.sold, 11, Via.whatsapp, ["lego-bricks"], "Around 5 kg of mixed bricks."),
    ("speaker", "resident.11", "Bluetooth speaker (teal)", Cat.electronics, Cond.good, 3500,
     True, St.available, 8, Via.whatsapp, ["bluetooth-speaker"],
     "Great bass, battery lasts a full day. Charging cable included."),
]


async def seed_marketplace(session: AsyncSession, society: Society, users: dict[str, User]) -> None:
    """Re-running resets each demo listing to its seeded state."""
    now = datetime.now(UTC)
    for idx, row in enumerate(MARKETPLACE_SEED):
        key, seller_key, title, category, condition, price, negotiable = row[:7]
        status, days, via, photos, desc = row[7:]
        seller = users[seller_key]
        if not seller.phone:
            # Fake numbers: the app only ever uses them to build a contact link.
            seller.phone = f"+9198765{sid(f'phone.{seller_key}').int % 100000:05d}"
        listing = await session.get(MarketplaceListing, sid(f"listing.{key}"))
        if listing is None:
            listing = MarketplaceListing(id=sid(f"listing.{key}"), society_id=society.id)
            session.add(listing)
        listing.seller_id = seller.id
        listing.title, listing.category, listing.condition = title, category, condition
        listing.price_inr, listing.negotiable, listing.status = price, negotiable, status
        listing.description, listing.contact_method = desc, via
        listing.photos = [f"/images/marketplace/{name}.jpg" for name in photos]
        listing.pickup_note = "Pickup in society"
        listing.listed_at = now - timedelta(days=days, hours=idx)
        listing.removed_reason = listing.removed_by_id = None


def _fake_phone(label: str) -> str:
    return f"+9198765{sid(f'phone.{label}').int % 100000:05d}"


async def _seed_business_owner(
    session: AsyncSession, society: Society, flats: dict[str, Flat], item: SeedBusiness
) -> User:
    owner = await get_or_create(
        session,
        User,
        sid(f"user.biz.{item.key}"),
        supabase_uid=f"seed:biz.{item.key}@aangan.app",
        email=f"biz.{item.key}@aangan.app",
        name=item.owner_name,
    )
    owner.phone = _fake_phone(f"biz.{item.key}")
    owner.created_at = datetime(item.resident_since, 6, 1, tzinfo=UTC)
    await _ensure_membership(
        session,
        sid(f"membership.biz.{item.key}"),
        owner.id,
        society.id,
        flats[item.flat_key].id,
        MembershipRole.owner,
    )
    if await session.get(Profile, owner.id) is None:
        session.add(Profile(user_id=owner.id, society_id=society.id, is_visible=True))
    return owner


def _recommenders(index: int, item: SeedBusiness, users: dict[str, User]) -> list[tuple[User, str | None]]:
    """Visible-profile residents (even index) get the written notes; the rest just count."""
    evens = [users[f"resident.{n}"] for n in range(0, 20, 2)]
    odds = [users[f"resident.{n}"] for n in range(1, 20, 2)]
    shift = (index * 3) % 10
    evens, odds = evens[shift:] + evens[:shift], odds[shift:] + odds[:shift]
    pairs: list[tuple[User, str | None]] = list(zip(evens, item.notes, strict=False))
    plain = evens[len(item.notes) :] + odds
    pairs += [(user, None) for user in plain[: item.recommendations - len(pairs)]]
    return pairs


async def seed_local_businesses(
    session: AsyncSession, society: Society, users: dict[str, User], flats: dict[str, Flat]
) -> None:
    """Re-running resets the demo businesses, their updates, follows and recommendations."""
    now = datetime.now(UTC)
    demo = users["demo"]
    ids = [sid(f"business.{item.key}") for item in BUSINESSES]
    await session.execute(
        delete(Notification).where(
            Notification.user_id == demo.id, Notification.href.like("/local-businesses/%")
        )
    )
    for model in (BusinessUpdate, BusinessFollow, BusinessRecommendation):
        await session.execute(delete(model).where(model.business_id.in_(ids)))
    for index, item in enumerate(BUSINESSES):
        owner = await _seed_business_owner(session, society, flats, item)
        business = await session.get(LocalBusiness, sid(f"business.{item.key}"))
        if business is None:
            business = LocalBusiness(id=sid(f"business.{item.key}"), society_id=society.id)
            session.add(business)
        base = f"/images/local-businesses/{item.key}"
        business.owner_id = owner.id
        business.name, business.category, business.tagline = item.name, item.category, item.tagline
        business.about, business.cover_url = item.about, f"{base}-cover.jpg"
        business.photos = [f"{base}-{n}.jpg" for n in range(1, item.photos + 1)]
        business.offerings, business.timings, business.days = item.offerings, item.timings, item.days
        business.serves, business.contact_method = item.serves, item.contact
        business.availability, business.is_featured = item.availability, item.featured
        business.review_status = (
            BusinessReviewStatus.approved if item.approved else BusinessReviewStatus.pending
        )
        business.rejection_reason = business.removed_reason = None
        business.created_at = now - timedelta(days=item.listed_days_ago)
        await session.flush()
        for number, (text, hours_ago) in enumerate(item.updates):
            session.add(
                BusinessUpdate(
                    id=sid(f"business-update.{item.key}.{number}"),
                    business_id=business.id,
                    society_id=society.id,
                    text=text,
                    created_at=now - timedelta(hours=hours_ago),
                )
            )
        recommenders = _recommenders(index, item, users)
        if DEMO_RECOMMENDS[0] == item.key:
            recommenders = recommenders[:-1] + [(demo, DEMO_RECOMMENDS[1])]
        for number, (user, note) in enumerate(recommenders):
            session.add(
                BusinessRecommendation(
                    id=sid(f"business-rec.{item.key}.{user.id}"),
                    business_id=business.id,
                    society_id=society.id,
                    user_id=user.id,
                    note=note,
                    created_at=now - timedelta(days=2 + 3 * number),
                )
            )
        if item.key in DEMO_FOLLOWS:
            session.add(
                BusinessFollow(
                    id=sid(f"business-follow.{item.key}"),
                    business_id=business.id,
                    society_id=society.id,
                    user_id=demo.id,
                )
            )
            if item.updates:
                session.add(
                    Notification(
                        id=sid(f"notification.business.{item.key}"),
                        society_id=society.id,
                        user_id=demo.id,
                        kind="business_update",
                        title=item.name,
                        body=item.updates[0][0],
                        href=f"/local-businesses/{business.id}",
                        created_at=now - timedelta(hours=item.updates[0][1]),
                    )
                )


async def seed_flat_openings(
    session: AsyncSession, society: Society, users: dict[str, User], flats: dict[str, Flat]
) -> None:
    """Re-running resets each demo opening and the demo resident's expiry reminder."""
    now = datetime.now(UTC)
    today = now.astimezone(timezone(timedelta(hours=5, minutes=30))).date()
    await session.execute(
        delete(Notification).where(
            Notification.user_id == users["demo"].id, Notification.kind == "opening_expiring"
        )
    )
    for item in OPENINGS:
        poster = users[item.poster]
        if not poster.phone:
            poster.phone = _fake_phone(item.poster)
        opening = await session.get(FlatOpening, sid(f"opening.{item.key}"))
        if opening is None:
            opening = FlatOpening(id=sid(f"opening.{item.key}"), society_id=society.id)
            session.add(opening)
        listed = now - timedelta(days=item.posted_days_ago)
        opening.poster_id, opening.tower_id = poster.id, flats[f"{item.tower}-101"].tower_id
        opening.kind, opening.bhk, opening.floor = item.kind, item.bhk, item.floor
        opening.furnishing, opening.rent_inr = item.furnishing, item.rent
        opening.deposit_inr = item.deposit
        opening.maintenance_included = item.maintenance is None
        opening.maintenance_inr = item.maintenance
        opening.available_from = (
            today + timedelta(days=item.available_in_days) if item.available_in_days else None
        )
        opening.preference, opening.included = item.preference, [i.value for i in item.included]
        opening.description, opening.contact_method = item.description, item.via
        opening.status = OpeningStatus.active
        opening.listed_at, opening.expires_at = listed, listed + timedelta(days=30)
        opening.reminder_sent_at = opening.removed_reason = opening.removed_by_id = None


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
        await seed_marketplace(session, society, users)
        await seed_local_businesses(session, society, users, flats)
        await seed_flat_openings(session, society, users, flats)
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
