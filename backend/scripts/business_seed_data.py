"""Demo local businesses for seed.py: eight approved, one pending."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models import BusinessAvailability as Avail
from app.models import BusinessCategory as Cat
from app.models import BusinessServes, ListingContactMethod

ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
WEEKDAYS = ALL_DAYS[:5]


def offer(name: str, price: int, unit: str, note: str | None = None) -> dict[str, object]:
    return {"name": name, "price_inr": price, "unit": unit, "note": note}


@dataclass
class SeedBusiness:
    key: str
    owner_name: str
    flat_key: str  # decides the tower shown on the card
    resident_since: int
    name: str
    category: Cat
    tagline: str
    about: str
    offerings: list[dict[str, object]]
    timings: str
    days: list[str]
    serves: BusinessServes
    contact: ListingContactMethod = ListingContactMethod.whatsapp
    availability: Avail = Avail.taking_orders
    featured: bool = False
    approved: bool = True
    listed_days_ago: int = 30
    # (text, hours ago), newest first
    updates: list[tuple[str, int]] = field(default_factory=list)
    recommendations: int = 0
    notes: list[str] = field(default_factory=list)
    photos: int = 1  # gallery images after the cover


Wa, Call = ListingContactMethod.whatsapp, ListingContactMethod.call
Within, AllTowers = BusinessServes.within_society, BusinessServes.all_towers

BUSINESSES: list[SeedBusiness] = [
    SeedBusiness(
        "amma", "Lakshmi Narayanan", "B-105", 2022, "Amma's South Indian Tiffin", Cat.food,
        "Home-cooked South Indian meals, delivered fresh",
        "Hot meals cooked every morning in my own kitchen: rice, sambar, rasam, two vegetables "
        "and curd. No onion-garlic on Tuesdays and Saturdays. Order by 9 AM for same-day lunch.",
        [offer("Veg meals", 120, "per_meal"), offer("Monthly plan", 3200, "per_month")],
        "11 AM to 2 PM", ALL_DAYS[:6], AllTowers, featured=True, listed_days_ago=120,
        updates=[("Today: lemon rice, sambar, curd rice", 2), ("Tomorrow: rajma chawal", 26)],
        recommendations=14,
        notes=["Tastes exactly like home. The sambar is the best in the society.",
               "Always on time, and the portions are generous.",
               "Switched to the monthly plan and have not cooked lunch since."],
    ),
    SeedBusiness(
        "maths", "Suresh Iyer", "D-104", 2023, "Focus Maths", Cat.tuition,
        "Maths tuition for classes 6 to 10, small batches",
        "Concept-first maths teaching with weekly tests and doubt sessions. Batches are capped "
        "at eight so every child gets attention. Trial class is free.",
        [offer("Class 6 to 8", 2500, "per_month"),
         offer("Class 9 to 10", 3000, "per_month", "3 seats left")],
        "5 PM to 8 PM", WEEKDAYS, Within, featured=True, listed_days_ago=90,
        updates=[("Class 9 batch has 3 seats left", 20)], recommendations=9,
        notes=["My son's marks went from 62 to 84 in one term.",
               "Patient teacher and very clear explanations."],
    ),
    SeedBusiness(
        "steps", "Pooja Malhotra", "A-108", 2023, "Little Steps Babysitting", Cat.childcare,
        "Caring evening and weekend babysitting",
        "Trained in first aid, with five years of experience looking after children aged two to "
        "ten. I can help with homework, dinner and bedtime routines.",
        [offer("Babysitting", 250, "per_hour")],
        "Evenings and weekends", ALL_DAYS, Within, listed_days_ago=60,
        updates=[("Free this Saturday evening", 5)], recommendations=6,
        notes=["Our kids love her. We trust her completely."],
    ),
    SeedBusiness(
        "paws", "Arjun Kapoor", "C-103", 2024, "Pawsome Dog Walks & Sitting", Cat.pet_care,
        "Daily walks and day sitting for your dog",
        "Lifelong dog person. I walk dogs around the society loop and offer day sitting at my "
        "home. Photo updates during every walk.",
        [offer("Dog walk (30 min)", 200, "each"), offer("Day sitting", 800, "per_day")],
        "7 AM to 7 PM", ALL_DAYS, AllTowers, availability=Avail.fully_booked,
        listed_days_ago=45, updates=[("Morning walk slots are full till next week", 24)],
        recommendations=5, notes=["Bruno comes home tired and happy every day."],
    ),
    SeedBusiness(
        "riya", "Riya Bansal", "B-107", 2022, "Canvas by Riya", Cat.art,
        "Original acrylic paintings, commissions open",
        "Hand-painted acrylics on canvas, mostly landscapes and city scenes. Commissions are "
        "open: share a photo and a size and I will quote you within a day.",
        [offer("Sunset over the hills", 1500, "each"), offer("Peacock in blue", 3200, "each"),
         offer("Old banyan tree", 4500, "each"), offer("Monsoon street", 6000, "each")],
        "10 AM to 6 PM", ALL_DAYS, AllTowers, listed_days_ago=75,
        updates=[("New piece: Monsoon street", 48)], recommendations=4,
        notes=["The painting we commissioned is the centre of our living room."],
    ),
    SeedBusiness(
        "bake", "Simran Arora", "A-102", 2022, "Bake My Day", Cat.food,
        "Custom cakes and cookie boxes baked to order",
        "Eggless and with-egg cakes, brownies and cookies baked to order. Cakes start at 650 "
        "rupees for half a kilo. Please order two days ahead for custom designs.",
        [offer("Custom cakes (from)", 650, "each"), offer("Cookie box", 300, "each", "12 cookies")],
        "10 AM to 7 PM", ALL_DAYS, AllTowers, featured=True, listed_days_ago=100,
        updates=[("Orders open for Diwali cookie boxes", 3)], recommendations=11,
        notes=["The chocolate truffle cake was gone in ten minutes.",
               "Beautiful designs and never late."],
    ),
    SeedBusiness(
        "yoga", "Meera Nair", "A-109", 2023, "Yoga with Meera", Cat.wellness,
        "Gentle morning yoga for all levels",
        "A 60-minute morning batch on the podium garden: breathing, mobility and flow. "
        "Suitable for beginners and for anyone with a desk job.",
        [offer("Morning batch", 1800, "per_month")],
        "6:30 AM to 7:30 AM", ALL_DAYS[:6], Within, listed_days_ago=55,
        updates=[("New 6:30 AM batch starts Monday", 40)], recommendations=7,
        notes=["My back pain is much better after two months."],
    ),
    SeedBusiness(
        "glow", "Neha Sethi", "C-106", 2024, "Glow Studio", Cat.wellness,
        "Salon services at your doorstep or at my studio",
        "Haircuts, facials and styling. Bridal prep is available on request, please message to "
        "discuss your date and requirements.",
        [offer("Haircut", 400, "each")],
        "10 AM to 7 PM", ALL_DAYS[1:], AllTowers, availability=Avail.on_break,
        listed_days_ago=35, updates=[("Festive offers on hair spa this week", 96)],
        recommendations=3, notes=["Neat work and very hygienic."],
    ),
    SeedBusiness(
        "dance", "Isha Joshi", "A-103", 2024, "Isha's Kids Dance Classes", Cat.tuition,
        "Fun Bollywood and contemporary classes for kids",
        "Weekend dance classes for children aged five to twelve, ending with a small "
        "performance for parents every quarter.",
        [offer("Weekend batch", 1500, "per_month")],
        "Saturday 4 PM to 5 PM", ["sat"], Within, approved=False, listed_days_ago=0,
        recommendations=0,
    ),
]

# The demo resident follows two businesses and has recommended one.
DEMO_FOLLOWS = ("amma", "bake")
DEMO_RECOMMENDS = ("yoga", "Great morning batch, very relaxed.")
