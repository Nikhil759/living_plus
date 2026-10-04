"""Help desk, notices and feed demo data, kept in line with society-guide/.

Times are IST wall clock. Reporter/follower keys refer to seed users ("demo", "resident.N").
"""

# Display text uses real en dashes for time ranges, as the society guide does.
# ruff: noqa: RUF001

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.enums import (
    PostType,
    TicketCategory,
    TicketScope,
    TicketStatus,
    TicketUrgency,
    VendorCategory,
)


@dataclass(frozen=True)
class SeedVendor:
    key: str
    name: str
    category: VendorCategory
    emoji: str
    note: str
    phone: str | None = None
    whatsapp: str | None = None
    hours_label: str | None = None


VENDORS: list[SeedVendor] = [
    SeedVendor("hk-1", "Society housekeeping desk", VendorCategory.housekeeping, "🧹",
               "Daily maid roster, deep clean, move-in/out", "+911244000101", "911244000101",
               "8 AM – 6 PM"),
    SeedVendor("hk-2", "Priya Home Help Agency", VendorCategory.housekeeping, "👩‍🍳",
               "Verified cooks and part-time help for towers A–D", whatsapp="919876500100"),
    SeedVendor("elec-1", "QuickFix Electricians", VendorCategory.electrical, "⚡",
               "MCB, wiring, geyser — society empanelled", "+919811220033", "919811220033"),
    SeedVendor("plumb-1", "AquaCare Plumbing", VendorCategory.plumbing, "🔧",
               "Leaks, taps, RO service", "+919955667788", "919955667788"),
    SeedVendor("appliance-1", "FitPro Appliance Repair", VendorCategory.appliance, "🔩",
               "Gym equipment, AC and kitchen appliances", whatsapp="919800112233",
               hours_label="9 AM – 7 PM"),
    SeedVendor("sec-1", "Gate 1 security supervisor", VendorCategory.security, "🛡️",
               "Visitor issues, parking disputes", "+911244000201"),
    SeedVendor("carp-1", "WoodCraft Interiors", VendorCategory.carpentry, "🪚",
               "Modular repairs, door alignment", whatsapp="919888776655"),
    SeedVendor("pest-1", "SafeHome Pest Control", VendorCategory.pest_control, "🐜",
               "Quarterly society spray + flat visits", whatsapp="919900887700"),
]


@dataclass(frozen=True)
class SeedTimeline:
    kind: str
    by: str  # "committee" or a user key
    message: str
    at: str  # ISO date-time, IST


@dataclass(frozen=True)
class SeedIssue:
    number: int
    title: str
    description: str
    category: TicketCategory
    scope: TicketScope
    tower: str
    area_label: str | None
    urgency: TicketUrgency
    status: TicketStatus
    created_at: str
    reporter: str
    followers: list[str] = field(default_factory=list)
    vendor: str | None = None
    awaiting_confirmation: bool = False
    timeline: list[SeedTimeline] = field(default_factory=list)


ISSUES: list[SeedIssue] = [
    SeedIssue(
        1042,
        "Tower B Lift 2 stops at 5th floor",
        "Lift 2 in Tower B pauses or jerks at the 5th floor landing, especially during the "
        "morning rush.",
        TicketCategory.lift,
        TicketScope.common_area,
        "B",
        "Lift 2",
        TicketUrgency.urgent,
        TicketStatus.open,
        "2026-09-28T08:00",
        reporter="resident.1",
        # 11 residents in all, counting the reporter.
        followers=[f"resident.{n}" for n in (5, 9, 13, 17, 2, 6, 10, 14, 18, 3)],
        timeline=[
            SeedTimeline("created", "resident.1", "Reported the issue.", "2026-09-28T08:00"),
            SeedTimeline("comment", "resident.5",
                         "Same issue yesterday evening — had to take the stairs.",
                         "2026-09-29T10:15"),
        ],
    ),
    SeedIssue(
        1088,
        "Low pressure in Tower C morning supply",
        "Water pressure drops between 6 and 8 AM on the 7th floor and above.",
        TicketCategory.water,
        TicketScope.common_area,
        "C",
        "Upper floors",
        TicketUrgency.normal,
        TicketStatus.open,
        "2026-10-02T06:30",
        reporter="demo",
        timeline=[SeedTimeline("created", "demo", "Reported the issue.", "2026-10-02T06:30")],
    ),
    SeedIssue(
        991,
        "Treadmill #2 belt slipping",
        "Belt slips when speed goes above 8 km/h. Safety concern during peak hours.",
        TicketCategory.amenity,
        TicketScope.common_area,
        "C",
        "Clubhouse gym",
        TicketUrgency.normal,
        TicketStatus.in_progress,
        "2026-09-25T19:00",
        reporter="resident.2",
        followers=["demo"],
        vendor="appliance-1",
        timeline=[
            SeedTimeline("created", "resident.2", "Reported the issue.", "2026-09-25T19:00"),
            SeedTimeline("status", "committee", "Marked in progress.", "2026-09-26T10:00"),
            SeedTimeline("vendor", "committee", "Assigned to FitPro Appliance Repair.",
                         "2026-09-26T10:01"),
        ],
    ),
    SeedIssue(
        970,
        "Bedroom AC not cooling",
        "Split AC in the master bedroom blows air but does not cool. Filter cleaned last week.",
        TicketCategory.electricity,
        TicketScope.my_flat,
        "C",
        None,
        TicketUrgency.normal,
        TicketStatus.resolved,
        "2026-09-20T21:00",
        reporter="demo",
        awaiting_confirmation=True,
        timeline=[
            SeedTimeline("created", "demo", "Reported the issue.", "2026-09-20T21:00"),
            SeedTimeline("status", "committee", "Marked resolved after a gas refill.",
                         "2026-09-23T17:30"),
        ],
    ),
]


@dataclass(frozen=True)
class SeedNotice:
    lead: str
    body: str
    posted: str  # IST date-time; matches the notice date in society-guide/notices


# Short versions of society-guide/notices; Saarthi answers from the full documents.
NOTICES: list[SeedNotice] = [
    SeedNotice("Water shutdown, Tower B",
               "Tue 6 Oct, 2:00–4:00 PM to replace the overhead tank's transfer motor. "
               "Please store water.", "2026-10-03T09:00"),
    SeedNotice("Diwali Mela 2026",
               "Sat 7 Nov, 5–10 PM. Stall applications close Fri 23 Oct at 6:00 PM "
               "(₹1,500 food, ₹800 craft).", "2026-10-01T09:00"),
    SeedNotice("Pool closed",
               "12–14 Oct for the filtration upgrade; reopens Thu 15 Oct at 6:00 AM.",
               "2026-10-02T09:00"),
    SeedNotice("Fire drill",
               "Sat 17 Oct at 11:00 AM. Use the stairs and gather on the central lawn.",
               "2026-09-30T09:00"),
    SeedNotice("Mosquito fogging",
               "Every Wed and Sat in October, 6–7 PM. Keep windows and balcony doors closed.",
               "2026-09-28T09:00"),
    SeedNotice("New parking stickers",
               "Collect them from the facility desk; old stickers stop working on 1 Nov.",
               "2026-09-25T09:00"),
]


@dataclass(frozen=True)
class SeedPost:
    author: str
    post_type: PostType
    body: str
    posted: str


SOCIETY_POSTS: list[SeedPost] = [
    SeedPost("resident.10", PostType.question,
             "Any recommendations for a good tailor near Gate 2?", "2026-10-02T18:20"),
    SeedPost("resident.6", PostType.lost_found,
             "Found a kid's blue water bottle near the play area. It's with the Tower B guard.",
             "2026-10-03T08:10"),
    SeedPost("resident.15", PostType.recommendation,
             "The new tiffin service in Tower D does great rajma chawal. Worth a try!",
             "2026-10-03T13:40"),
]
