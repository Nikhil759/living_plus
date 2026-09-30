import type { HomeData, HomeEvent, Resident } from "@/lib/types/home";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Next occurrence of `weekday` (0 = Sun … 6 = Sat) at `hour:minute` IST,
 * so the mock events always look upcoming.
 */
function nextWeekday(weekday: number, hour: number, minute = 0): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const daysAhead = (weekday - nowIst.getUTCDay() + 7) % 7 || 7;
  const target = new Date(nowIst.getTime() + daysAhead * DAY_MS);
  target.setUTCHours(hour, minute, 0, 0);
  return new Date(target.getTime() - IST_OFFSET_MS).toISOString();
}

export const mockResident: Resident = {
  id: "res-nikhil",
  name: "Nikhil",
  avatarUrl: "/mock/avatar-nikhil.jpg",
  society: "Sector 50 Residency",
  tower: "Tower C",
  flat: "702",
  roles: ["Tower C Rep"],
  hasUnreadNotifications: true,
};

export const mockEvents: HomeEvent[] = [
  {
    id: "evt-fifa-night",
    title: "FIFA 24 Tournament & Game Night",
    host: "Rohan (B-404) hosting",
    hostIcon: "person",
    startsAt: nextWeekday(6, 21),
    location: "Club Lounge",
    priceInr: 0,
    imageUrl: "/mock/event-fifa.jpg",
    imageAlt: "Friends playing FIFA together on a couch",
    glyph: "game",
    goingCount: 8,
    actionLabel: "RSVP",
    actionTone: "solid",
    href: "/events/evt-fifa-night",
  },
  {
    id: "evt-salsa",
    title: "Community Salsa & Bachata",
    host: "Ananya (D-102) & Studio 7",
    hostIcon: "celebration",
    startsAt: nextWeekday(0, 18),
    location: "Community Hall",
    priceInr: 499,
    imageUrl: "/mock/event-salsa.jpg",
    imageAlt: "Residents dancing salsa in the clubhouse",
    glyph: "music",
    goingCount: 14,
    actionLabel: "Book Spot",
    actionTone: "soft",
    href: "/events/evt-salsa",
  },
  {
    id: "evt-expressway-ride",
    title: "Morning Expressway 25km Ride",
    host: "Resident Cyclists Club",
    hostIcon: "club",
    startsAt: nextWeekday(6, 6, 30),
    location: "Main Gate",
    priceInr: 0,
    glyph: "ride",
    goingCount: 11,
    actionLabel: "Join Ride",
    actionTone: "solid",
    href: "/events/evt-expressway-ride",
  },
  {
    id: "evt-terrace-yoga",
    title: "Sunrise Yoga on the Terrace",
    host: "Meera (A-301) · Yoga Circle",
    hostIcon: "person",
    startsAt: nextWeekday(0, 6, 30),
    location: "Clubhouse Terrace",
    priceInr: 0,
    glyph: "wellness",
    goingCount: 9,
    actionLabel: "RSVP",
    actionTone: "soft",
    href: "/events/evt-terrace-yoga",
  },
];

export const mockHomeData: HomeData = {
  resident: mockResident,
  digest: {
    title: "Society Digest",
    subtitle: "Live updates curated for Tower C",
    totalCount: 5,
    items: [
      {
        id: "dg-water",
        emoji: "💧",
        lead: "Water maintenance:",
        body: "Tower B supply paused 2:00 PM – 4:00 PM today for motor replacement.",
      },
      {
        id: "dg-mela",
        emoji: "✨",
        lead: "Diwali Mela 2024:",
        body: "Food & handcraft stall slots close this Friday at 6:00 PM.",
      },
      {
        id: "dg-mail",
        emoji: "📦",
        lead: "Central Mailroom:",
        body: "2 packages arrived for C-702 at Security Gate 1 desk.",
      },
    ],
  },
  events: mockEvents,
  amenities: [
    { id: "am-gym", name: "Gym", emoji: "💪", status: "moderate", detail: "Moderate · 6 active" },
    { id: "am-pool", name: "Pool", emoji: "🏊", status: "quiet", detail: "Quiet · 2 swimmers" },
    { id: "am-badminton", name: "Badminton 1", emoji: "🏸", status: "booked", detail: "Booked till 7:00 PM" },
    { id: "am-tennis", name: "Tennis Court", emoji: "🎾", status: "free", detail: "Free now" },
    { id: "am-cafe", name: "Café Lounge", emoji: "☕", status: "open", detail: "Open" },
  ],
  match: {
    label: "Interest Match",
    title: "Neighbours like you",
    description: "4 neighbours in Tower B also play PlayStation & FIFA on weekends.",
    totalCount: 7,
    people: [
      { id: "p-kunal", name: "Kunal Mehra" },
      { id: "p-amit", name: "Amit Shah" },
      { id: "p-sana", name: "Sana Khan" },
    ],
    activeSummary: "Kunal, Amit & 2 others active today",
    actionLabel: "Start a group",
  },
  prompt: { suggestion: "When is dry waste collection today?" },
};

export interface GetHomeDataOptions {
  /** Return a brand-new-society state: nothing scheduled, nothing live. */
  empty?: boolean;
  /** Simulated network latency so `loading.tsx` is visible in dev. */
  delayMs?: number;
}

/** Stand-in for the real API. Swap the body for a fetch when the backend exists. */
export async function getHomeData({
  empty = false,
  delayMs = 700,
}: GetHomeDataOptions = {}): Promise<HomeData> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (empty) {
    return { ...mockHomeData, digest: null, events: [], amenities: [], match: null };
  }
  return mockHomeData;
}
