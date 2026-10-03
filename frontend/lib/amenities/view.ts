import type { StatusTone } from "@/components/ui/status-dot";
import type { AmenitySlot } from "@/lib/types/amenities";
import type { Amenity, AmenityStatus } from "@/lib/types/home";

const TIME_ZONE = "Asia/Kolkata";
const EN_DASH = "\u2013";

export const AMENITY_FILTERS = [
  { id: "all", label: "All" },
  { id: "sports", label: "Sports" },
  { id: "fitness", label: "Fitness" },
  { id: "spaces", label: "Spaces" },
] as const;

export type AmenityFilter = (typeof AMENITY_FILTERS)[number]["id"];

export function filterAmenities(amenities: Amenity[], filter: AmenityFilter): Amenity[] {
  if (filter === "all") return amenities;
  return amenities.filter((amenity) => amenity.category === filter);
}

export function amenityTone(status: AmenityStatus): StatusTone {
  if (status === "booked") return "red";
  if (status === "moderate") return "amber";
  if (status === "closed") return "quiet";
  return "green";
}

const FALLBACK_LABEL: Record<AmenityStatus, string> = {
  free: "Quiet",
  open: "Quiet",
  quiet: "Quiet",
  moderate: "Moderate",
  booked: "Busy",
  closed: "Closed",
};

export function amenityStatusLabel(amenity: Pick<Amenity, "status" | "statusLabel">): string {
  return amenity.statusLabel ?? FALLBACK_LABEL[amenity.status];
}

/** Short card label: bookable "Book", walk-in "View", spaces "Host an event". */
export function amenityCardActionLabel(amenity: Pick<Amenity, "action" | "actionLabel">): string {
  if (amenity.action === "book") return "Book";
  if (amenity.action === "host") return "Host an event";
  return amenity.action === "view" ? "View" : (amenity.actionLabel ?? "View");
}

export function amenityHref(id: string): string {
  return `/amenities/${encodeURIComponent(id)}`;
}

/** Spaces open the event form with the space preselected; the rest open the detail page. */
export function amenityActionHref(amenity: Pick<Amenity, "id" | "name" | "action">): string {
  if (amenity.action === "host") {
    return `/events/new?venue=${encodeURIComponent(amenity.name)}`;
  }
  return amenityHref(amenity.id);
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hourParts(iso: string): { hour: string; period: string } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    hour12: true,
    timeZone: TIME_ZONE,
  }).formatToParts(new Date(iso));
  const find = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { hour: find("hour"), period: find("dayPeriod").toUpperCase() };
}

/** "Today", "Tomorrow" or "Sat, 4 Oct". */
export function formatBookingDay(startsAt: string, now: Date = new Date()): string {
  const start = new Date(startsAt);
  if (dayKey(start) === dayKey(now)) return "Today";
  if (dayKey(start) === dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return "Tomorrow";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(start);
}

/** "7–8 AM" or "11 AM–12 PM". */
export function formatSlotRange(startsAt: string, endsAt: string): string {
  const from = hourParts(startsAt);
  const to = hourParts(endsAt);
  if (from.period === to.period) return `${from.hour}${EN_DASH}${to.hour} ${to.period}`;
  return `${from.hour} ${from.period}${EN_DASH}${to.hour} ${to.period}`;
}

/** Today's date in IST as "YYYY-MM-DD". */
export function istToday(now: Date = new Date()): string {
  return dayKey(now);
}

/** Pure calendar arithmetic on "YYYY-MM-DD" strings. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function nextDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index));
}

/** { weekday: "Tue", date: "1" } for the day-picker chips. */
export function dayChip(day: string, today: string): { weekday: string; date: string } {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return { weekday: day === today ? "Today" : weekday, date: String(d) };
}

/** 6 -> "6 AM", 13 -> "1 PM". */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

const SLOT_GROUPS = [
  { id: "morning", label: "Morning", range: "6\u201312", from: 0, to: 12 },
  { id: "afternoon", label: "Afternoon", range: "12\u20135", from: 12, to: 17 },
  { id: "evening", label: "Evening", range: "5\u201310", from: 17, to: 24 },
] as const;

export interface SlotGroup {
  id: string;
  label: string;
  range: string;
  slots: AmenitySlot[];
}

/** Hour of day in IST for an ISO timestamp. */
export function istHour(iso: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
  return Number(hour);
}

/** Morning / Afternoon / Evening groups. Past slots are hidden and empty groups skipped. */
export function groupSlots(slots: AmenitySlot[]): SlotGroup[] {
  const upcoming = slots.filter((slot) => slot.state !== "past");
  return SLOT_GROUPS.map(({ id, label, range, from, to }) => ({
    id,
    label,
    range,
    slots: upcoming.filter((slot) => {
      const hour = istHour(slot.startsAt);
      return hour >= from && hour < to;
    }),
  })).filter((group) => group.slots.length > 0);
}

export function hasFreeSlot(slots: AmenitySlot[]): boolean {
  return slots.some((slot) => slot.state === "free");
}

function shortDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).formatToParts(date);
  const find = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${find("weekday")} ${find("day")} ${find("month")}`;
}

/** "Sat 3 Oct" for a slot start. */
export function formatSummaryDay(startsAt: string): string {
  return shortDate(new Date(startsAt), TIME_ZONE);
}

/** "Tue 6 Oct" for a "YYYY-MM-DD" day. */
export function formatDateLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return shortDate(new Date(Date.UTC(y, m - 1, d)), "UTC");
}
