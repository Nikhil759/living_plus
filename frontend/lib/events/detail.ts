import { formatPriceInr } from "@/lib/format";
import type { EventAudience, EventHostProfile, HomeEvent, Resident } from "@/lib/types/home";

const SOCIETY_VENUES: Record<string, string> = {
  "tennis courts": "am-tennis",
  "tennis court": "am-tennis",
  gym: "am-gym",
  pool: "am-pool",
  "cafe lounge": "am-cafe",
};

export type EventMainActionKind =
  | "rsvp"
  | "pay"
  | "waitlist"
  | "waitlisted"
  | "leave"
  | "stall"
  | "ended"
  | "cancelled"
  | "pending"
  | "draft"
  | "rejected";

export interface EventMainAction {
  kind: EventMainActionKind;
  label: string;
  enabled: boolean;
}

export interface EventBanner {
  tone: "warn" | "danger" | "info";
  text: string;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function parseHostTower(host: string): string | undefined {
  const match = host.match(/\(([A-Za-z0-9]+)-/);
  if (!match) return undefined;
  const token = match[1];
  return /^tower/i.test(token) ? token : `Tower ${token}`;
}

export function hostedEventCount(event: HomeEvent, catalog: HomeEvent[]): number {
  return catalog.filter((item) => {
    const status = item.status ?? "published";
    if (status !== "published" && status !== "completed") return false;
    if (event.hostUserId && item.hostUserId) return item.hostUserId === event.hostUserId;
    return item.host === event.host;
  }).length;
}

export function buildHostProfile(
  event: HomeEvent,
  catalog: HomeEvent[],
  resident?: Pick<Resident, "name" | "avatarUrl" | "tower">,
): EventHostProfile {
  const name = event.hostName ?? firstName(event.host);
  const fromGoing = (event.going ?? []).find((person) => person.name === name);
  return {
    id: event.hostUserId ?? "host",
    name,
    avatarUrl: event.isHost ? resident?.avatarUrl : fromGoing?.avatarUrl,
    tower: event.isHost ? resident?.tower : parseHostTower(event.host),
    eventsHosted: hostedEventCount(event, catalog),
  };
}

export function attachHostProfile(
  event: HomeEvent,
  catalog: HomeEvent[],
  resident?: Pick<Resident, "name" | "avatarUrl" | "tower">,
): HomeEvent {
  if (event.hostProfile) return event;
  return { ...event, hostProfile: buildHostProfile(event, catalog, resident) };
}

export function eventVenueHref(event: Pick<HomeEvent, "location" | "amenityId">): string | undefined {
  const amenityId = event.amenityId ?? SOCIETY_VENUES[event.location.trim().toLowerCase()];
  return amenityId ? `/amenities#${amenityId}` : undefined;
}

export function eventCapacityLabel(event: Pick<HomeEvent, "goingCount" | "capacity">): string | undefined {
  if (event.capacity == null) return undefined;
  return `${event.goingCount} of ${event.capacity} spots taken`;
}

export function eventSpotsLabel(event: Pick<HomeEvent, "goingCount" | "capacity">): string | undefined {
  if (event.capacity == null) return undefined;
  return `${event.goingCount} of ${event.capacity} spots`;
}

export function eventCapacityRatio(event: Pick<HomeEvent, "goingCount" | "capacity">): number | undefined {
  if (event.capacity == null || event.capacity <= 0) return undefined;
  return Math.min(1, Math.max(0, event.goingCount / event.capacity));
}

export function eventGuestLabel(guestLimit: number | undefined): string | undefined {
  if (guestLimit == null || guestLimit <= 0) return undefined;
  return `Guests welcome · up to ${guestLimit} each`;
}

const AUDIENCE_LABEL: Record<EventAudience, string> = {
  society: "Residents only",
  group: "Group members",
  towers: "Selected towers",
};

export function eventAudienceLabel(
  event: Pick<HomeEvent, "audience" | "guestLimit">,
): string {
  if (event.audience === "group" || event.audience === "towers") {
    return AUDIENCE_LABEL[event.audience];
  }
  if (event.guestLimit != null && event.guestLimit > 0) {
    return `Guests welcome · up to ${event.guestLimit} each`;
  }
  return AUDIENCE_LABEL.society;
}

export function eventCoverPill(event: Pick<HomeEvent, "eventType" | "priceInr">): string {
  if (event.eventType === "society") return "Society";
  return formatPriceInr(event.priceInr);
}

export function eventGoingLabel(guestCount?: number): string {
  if (guestCount != null && guestCount > 0) {
    return guestCount === 1 ? "You're going · 1 guest" : `You're going · ${guestCount} guests`;
  }
  return "You're going";
}

export function eventRsvpQty(guestCount: number): number {
  return Math.max(0, guestCount) + 1;
}

export function eventMaxGuests(
  event: Pick<
    HomeEvent,
    "guestLimit" | "capacity" | "goingCount" | "viewerGoing" | "viewerGuestCount" | "viewerWaitlisted"
  >,
): number {
  const limit = event.guestLimit ?? 0;
  if (limit <= 0) return 0;
  if (event.capacity == null) return limit;
  const full = event.goingCount >= event.capacity;
  if (event.viewerWaitlisted || (full && !event.viewerGoing)) return limit;
  const ownQty = event.viewerGoing ? eventRsvpQty(event.viewerGuestCount ?? 0) : 0;
  const remaining = event.capacity - event.goingCount + ownQty;
  return Math.max(0, Math.min(limit, remaining - 1));
}

export function guestStepperLabel(count: number): string {
  if (count <= 0) return "No guests";
  return count === 1 ? "1 guest" : `${count} guests`;
}

export function isMutedEventAction(kind: EventMainActionKind): boolean {
  return kind === "ended" || kind === "cancelled" || kind === "pending" || kind === "draft" || kind === "rejected";
}

export function stallActionFor(event: HomeEvent): EventMainAction {
  const stall = event.viewerStall;
  const fee = event.stallFeeInr ?? stall?.feeInr ?? 0;
  if (stall?.status === "pending") {
    return { kind: "stall", label: "Application pending", enabled: false };
  }
  if (stall?.status === "approved") {
    if (fee > 0) {
      return { kind: "stall", label: `Pay stall fee · ${formatPriceInr(fee)}`, enabled: false };
    }
    return {
      kind: "stall",
      label: stall.spotNo ? `Stall approved · Spot ${stall.spotNo}` : "Stall approved",
      enabled: false,
    };
  }
  if (stall?.status === "paid") {
    return {
      kind: "stall",
      label: stall.spotNo ? `Your stall · Spot ${stall.spotNo}` : "Your stall",
      enabled: false,
    };
  }
  return { kind: "stall", label: "Apply for a stall", enabled: true };
}

export function eventBanners(event: HomeEvent): EventBanner[] {
  const banners: EventBanner[] = [];
  const status = event.status ?? "published";
  if (status === "pending_approval") {
    banners.push({ tone: "warn", text: "Pending approval" });
  }
  if (status === "rejected") {
    banners.push({
      tone: "danger",
      text: event.rejectionReason ? `Rejected: ${event.rejectionReason}` : "Rejected",
    });
  }
  if (status === "cancelled") {
    banners.push({
      tone: "danger",
      text: event.cancelReason ? `Cancelled: ${event.cancelReason}` : "Cancelled",
    });
  }
  if (event.changeSummary) {
    const text = /^changed\b/i.test(event.changeSummary)
      ? event.changeSummary
      : `Changed: ${event.changeSummary}`;
    banners.push({ tone: "info", text });
  }
  return banners;
}

export function eventMainAction(event: HomeEvent, now: number = Date.now()): EventMainAction {
  const status = event.status ?? "published";
  const ends = Date.parse(event.endsAt ?? event.startsAt);
  const full = event.capacity != null && event.goingCount >= event.capacity;

  if (status === "cancelled") return { kind: "cancelled", label: "Cancelled", enabled: false };
  if (status === "completed" || ends < now) {
    return { kind: "ended", label: "Event ended", enabled: false };
  }
  if (status === "draft") return { kind: "draft", label: "Draft", enabled: false };
  if (status === "rejected") return { kind: "rejected", label: "Rejected", enabled: false };
  if (status === "pending_approval") {
    return { kind: "pending", label: "Pending approval", enabled: false };
  }
  if (event.viewerGoing) {
    return { kind: "leave", label: "Can't make it?", enabled: true };
  }
  if (event.viewerWaitlisted) {
    return { kind: "waitlisted", label: "On the waitlist", enabled: true };
  }
  if (event.eventType === "society" && event.stallsEnabled) {
    return stallActionFor(event);
  }
  if (full) return { kind: "waitlist", label: "Join waitlist", enabled: true };
  if ((event.eventType ?? "free") === "paid" || event.priceInr > 0) {
    return { kind: "pay", label: `Book ticket · ${formatPriceInr(event.priceInr)}`, enabled: false };
  }
  return { kind: "rsvp", label: "I'm going", enabled: true };
}

function icsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function eventIcs(event: HomeEvent, url: string): string {
  const endsAt = event.endsAt ?? event.startsAt;
  const description = [event.description, event.whatToBring ? `What to bring: ${event.whatToBring}` : ""]
    .filter(Boolean)
    .join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Living+//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@living.plus`,
    `DTSTAMP:${icsUtc(new Date().toISOString())}`,
    `DTSTART:${icsUtc(event.startsAt)}`,
    `DTEND:${icsUtc(endsAt)}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location)}`,
    description ? `DESCRIPTION:${icsText(description)}` : "",
    url ? `URL:${icsText(url)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
