import type {
  EventAttendee,
  EventCategory,
  EventListTab,
  EventType,
  HomeEvent,
  Person,
  Resident,
} from "@/lib/types/home";

const TIME_ZONE = "Asia/Kolkata";
const HOST_ONLY = new Set(["draft", "pending_approval", "rejected"]);

export interface EventListQuery {
  tab?: EventListTab;
  eventType?: EventType | "all";
  category?: EventCategory | "all";
  q?: string;
}

export interface EventViewer {
  id: string;
  firstName: string;
  tower: string;
  flat: string;
  isCommittee: boolean;
  rsvpIds: string[];
}

export type UpcomingGroupId = "weekend" | "nextWeek" | "later";

export interface UpcomingGroup {
  id: UpcomingGroupId;
  label: string;
  events: HomeEvent[];
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function eventViewerFromResident(
  resident: Resident,
  rsvpIds: string[] = [],
): EventViewer {
  const roles = resident.roles.join(" ").toLowerCase();
  return {
    id: resident.id,
    firstName: firstName(resident.name),
    tower: resident.tower,
    flat: resident.flat,
    isCommittee: /committee|admin/i.test(roles),
    rsvpIds,
  };
}

export function isEventHost(event: HomeEvent, viewer: EventViewer): boolean {
  if (event.hostUserId && event.hostUserId === viewer.id) return true;
  const host = event.host.toLowerCase();
  const tower = viewer.tower.replace(/^tower\s+/i, "");
  const tokens = [
    `${viewer.firstName} (${viewer.tower}-${viewer.flat})`,
    `${viewer.firstName} (${tower}-${viewer.flat})`,
  ].map((value) => value.toLowerCase());
  return Boolean(viewer.firstName) && tokens.some((token) => host.includes(token));
}

export function publicGoingPeople(people: Person[] | undefined): Person[] {
  return (people ?? [])
    .filter((person) => person.isVisible !== false)
    .map((person) => ({
      id: person.id,
      name: firstName(person.name),
      avatarUrl: person.avatarUrl,
    }));
}

export function fullAttendees(people: Person[] | undefined): EventAttendee[] {
  return (people ?? []).map((person) => {
    const extra = person as EventAttendee;
    return {
      id: person.id,
      name: firstName(person.name),
      avatarUrl: person.avatarUrl,
      fullName: extra.fullName ?? person.name,
      tower: extra.tower,
      guestCount: extra.guestCount ?? 0,
      checkedIn: extra.checkedIn ?? false,
    };
  });
}

export function canViewEvent(event: HomeEvent): boolean {
  return matchesAudience(event);
}

export function annotateEvent(event: HomeEvent, viewer: EventViewer): HomeEvent {
  const rsvpSet = new Set(viewer.rsvpIds);
  const going = event.going ?? [];
  const isHost = isEventHost(event, viewer);
  const isCommittee = viewer.isCommittee;
  return {
    ...event,
    isHost,
    isCommittee,
    viewerGoing:
      Boolean(event.viewerGoing) ||
      rsvpSet.has(event.id) ||
      going.some((person) => person.id === viewer.id),
    going: publicGoingPeople(going),
    attendees: isHost || isCommittee ? (event.attendees ?? fullAttendees(going)) : null,
    rejectionReason: isHost ? event.rejectionReason : undefined,
  };
}

export function annotateEvents(events: HomeEvent[], viewer: EventViewer): HomeEvent[] {
  return events.map((event) => annotateEvent(event, viewer));
}

function isUpcomingStatus(event: HomeEvent, now: number): boolean {
  const status = event.status ?? "published";
  if (status === "cancelled") return Date.parse(event.startsAt) >= now;
  return status === "published" && Date.parse(event.startsAt) >= now;
}

function matchesTab(event: HomeEvent, tab: EventListTab, now: number): boolean {
  const status = event.status ?? "published";
  const ends = Date.parse(event.endsAt ?? event.startsAt);

  if (tab === "hosting") return Boolean(event.isHost);

  if (tab === "going") {
    return Boolean(event.viewerGoing) && Date.parse(event.startsAt) >= now && status !== "draft";
  }

  if (tab === "past") {
    return ends < now && (status === "published" || status === "cancelled" || status === "completed");
  }

  if (isUpcomingStatus(event, now)) return true;
  if (status === "pending_approval" && (event.isHost || event.isCommittee)) return true;
  return false;
}

function matchesAudience(event: HomeEvent): boolean {
  const status = event.status ?? "published";
  if (HOST_ONLY.has(status) && !event.isHost && !event.isCommittee) return false;
  return true;
}

function matchesSearch(event: HomeEvent, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const tags = (event.tags ?? []).join(" ");
  const blob = `${event.title} ${event.description ?? ""} ${tags}`.toLowerCase();
  return blob.includes(needle);
}

export function filterEvents(
  events: HomeEvent[],
  query: EventListQuery,
  now: number = Date.now(),
): HomeEvent[] {
  const tab = query.tab ?? "upcoming";
  const type = query.eventType && query.eventType !== "all" ? query.eventType : undefined;
  const category = query.category && query.category !== "all" ? query.category : undefined;
  const q = query.q ?? "";

  return events
    .filter(matchesAudience)
    .filter((event) => matchesTab(event, tab, now))
    .filter((event) => !type || (event.eventType ?? "free") === type)
    .filter((event) => !category || (event.category ?? "other") === category)
    .filter((event) => matchesSearch(event, q))
    .sort((a, b) => {
      if (tab === "past" || tab === "hosting") {
        return Date.parse(b.startsAt) - Date.parse(a.startsAt);
      }
      return Date.parse(a.startsAt) - Date.parse(b.startsAt);
    });
}

function istDateKey(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

function weekdayInIst(ms: number): number {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(
    new Date(ms),
  );
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
}

/** This weekend = now through Sunday; next week = the following Mon–Sun; later = after that. */
export function groupUpcoming(events: HomeEvent[], now: number = Date.now()): UpcomingGroup[] {
  const todayKey = istDateKey(now);
  const dow = weekdayInIst(now);
  const daysToSunday = (7 - dow) % 7;
  const weekendEndKey = addDaysKey(todayKey, daysToSunday);
  const nextWeekEndKey = addDaysKey(weekendEndKey, 7);

  const groups: Record<UpcomingGroupId, HomeEvent[]> = {
    weekend: [],
    nextWeek: [],
    later: [],
  };

  for (const event of events) {
    const key = istDateKey(Date.parse(event.startsAt));
    if (key <= weekendEndKey) groups.weekend.push(event);
    else if (key <= nextWeekEndKey) groups.nextWeek.push(event);
    else groups.later.push(event);
  }

  return (
    [
      { id: "weekend", label: "This weekend", events: groups.weekend },
      { id: "nextWeek", label: "Next week", events: groups.nextWeek },
      { id: "later", label: "Later", events: groups.later },
    ] satisfies UpcomingGroup[]
  ).filter((group) => group.events.length > 0);
}

export function isPublishedUpcoming(event: HomeEvent, now: number = Date.now()): boolean {
  return (event.status ?? "published") === "published" && Date.parse(event.startsAt) >= now;
}

export function eventStatusPills(event: Pick<HomeEvent, "status" | "capacity" | "goingCount" | "viewerGoing" | "viewerWaitlisted" | "isHost" | "isCommittee">): string[] {
  const pills: string[] = [];
  const status = event.status ?? "published";
  const capacity = event.capacity;
  const taken = event.goingCount;
  const left = capacity == null ? null : capacity - taken;

  if (status === "cancelled") pills.push("Cancelled");
  if (status === "rejected" && (event.isHost || event.isCommittee)) pills.push("Rejected");
  if (status === "pending_approval" && (event.isHost || event.isCommittee)) {
    pills.push("Pending approval");
  }
  if (event.viewerGoing && status !== "cancelled") pills.push("You're going");
  if (event.viewerWaitlisted && status !== "cancelled") pills.push("On the waitlist");
  if (status === "published" && left != null) {
    if (left <= 0) pills.push("Full · join waitlist");
    else if (left <= 5) pills.push(`${left} spots left`);
  }
  return pills;
}
