"""Demo flat openings. Dates are offsets from the seed day, so the demo never goes stale."""

from dataclasses import dataclass

from app.models import (
    ListingContactMethod,
    OpeningFurnishing,
    OpeningIncluded,
    OpeningKind,
    OpeningPreference,
)

Kind, Furn, Pref, Inc = OpeningKind, OpeningFurnishing, OpeningPreference, OpeningIncluded


@dataclass(frozen=True)
class SeedOpening:
    key: str
    poster: str  # key in the seed's users dict
    tower: str  # letter
    kind: OpeningKind
    bhk: int
    floor: int
    furnishing: OpeningFurnishing
    rent: int
    deposit: int
    maintenance: int | None  # None means included in the rent
    available_in_days: int  # 0 means "Available now"
    preference: OpeningPreference
    included: tuple[OpeningIncluded, ...]
    description: str
    via: ListingContactMethod
    posted_days_ago: int


OPENINGS: list[SeedOpening] = [
    SeedOpening(
        "room-c",
        "resident.2",
        "C",
        Kind.room_available,
        1,
        5,
        Furn.furnished,
        18_000,
        36_000,
        None,
        12,
        Pref.women_only,
        (Inc.wifi, Inc.ac),
        "Master bedroom in a quiet 1 BHK. Kitchen and hall shared with one working professional.",
        ListingContactMethod.whatsapp,
        2,
    ),
    SeedOpening(
        "mate-b",
        "resident.1",
        "B",
        Kind.flatmate_needed,
        2,
        8,
        Furn.semi_furnished,
        22_000,
        44_000,
        2_500,
        29,
        Pref.anyone,
        (Inc.parking, Inc.power_backup),
        "Second bedroom free in a bright corner 2 BHK. Utilities split equally. "
        "Gym regulars welcome.",
        ListingContactMethod.whatsapp,
        4,
    ),
    SeedOpening(
        "full-a",
        "resident.0",
        "A",
        Kind.full_flat,
        3,
        12,
        Furn.furnished,
        65_000,
        195_000,
        4_500,
        59,
        Pref.family,
        (Inc.ac, Inc.parking, Inc.power_backup, Inc.washing_machine),
        "Family relocating abroad. Two covered parking slots. Society NOC and reference available.",
        ListingContactMethod.call,
        5,
    ),
    SeedOpening(
        "room-d",
        "resident.3",
        "D",
        Kind.room_available,
        2,
        3,
        Furn.furnished,
        20_000,
        40_000,
        None,
        5,
        Pref.anyone,
        (Inc.wifi, Inc.maid),
        "Small bedroom with attached bath, ideal for one person. The maid comes twice a week.",
        ListingContactMethod.whatsapp,
        1,
    ),
    SeedOpening(
        "mate-b2",
        "resident.5",
        "B",
        Kind.flatmate_needed,
        1,
        2,
        Furn.furnished,
        16_000,
        32_000,
        None,
        17,
        Pref.men_only,
        (Inc.wifi,),
        "Compact 1 BHK near the lift. Looking for a quiet flatmate. "
        "The hall is set up for working from home.",
        ListingContactMethod.whatsapp,
        1,
    ),
    # The demo resident's own listing; posted 27 days ago, so its renewal reminder is due.
    SeedOpening(
        "full-c",
        "demo",
        "C",
        Kind.full_flat,
        2,
        7,
        Furn.semi_furnished,
        48_000,
        96_000,
        None,
        0,
        Pref.working_professionals,
        (Inc.parking, Inc.power_backup, Inc.cook),
        "11 months left on the agreement. Modular kitchen. Immediate move-in is possible.",
        ListingContactMethod.whatsapp,
        27,
    ),
]
