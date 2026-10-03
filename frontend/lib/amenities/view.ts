import type { StatusTone } from "@/components/ui/status-dot";
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
