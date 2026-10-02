import type Database from "better-sqlite3";
import { getDemoDb } from "@/lib/demo-store/db";
import { demoGetEventById, demoGetResidentForUser } from "@/lib/demo-store/readers";
import type { EventGlyph, EventHostIcon, HomeEvent, Person, Resident } from "@/lib/types/home";

const DEMO_EVENT_CAPACITY = 50;

export interface DemoEventCreateInput {
  title: string;
  location: string;
  startsAt: string;
  tags?: string[];
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "event";
}

function uniqueSlug(db: Database.Database, base: string): string {
  let candidate = base;
  let suffix = 0;
  while (
    db
      .prepare("SELECT 1 FROM demo_entity WHERE collection = ? AND id = ?")
      .get("events", candidate)
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "Neighbour";
}

function hostLabel(resident: Resident): string {
  const name = firstName(resident.name);
  return `${name} (${resident.tower}-${resident.flat}) hosting`;
}

function inferGlyph(title: string, tags: string[]): EventGlyph {
  const blob = `${title} ${tags.join(" ")}`.toLowerCase();
  if (blob.includes("fifa") || blob.includes("game")) return "game";
  if (blob.includes("yoga") || blob.includes("wellness")) return "wellness";
  if (blob.includes("salsa") || blob.includes("music")) return "music";
  if (blob.includes("ride") || blob.includes("cycl")) return "ride";
  return "general";
}

function hostIcon(glyph: EventGlyph): EventHostIcon {
  if (glyph === "music") return "celebration";
  if (glyph === "game") return "person";
  return "person";
}

function upsertEvent(db: Database.Database, id: string, event: HomeEvent): void {
  db.prepare(
    `INSERT INTO demo_entity (collection, id, payload) VALUES (?, ?, ?)
     ON CONFLICT(collection, id) DO UPDATE SET payload = excluded.payload`,
  ).run("events", id, JSON.stringify(event));
}

function personFromResident(resident: Resident): Person {
  return {
    id: resident.id,
    name: firstName(resident.name),
    avatarUrl: resident.avatarUrl,
  };
}

export function demoListUserRsvpEventIds(userId: string): string[] {
  const db = getDemoDb();
  const rows = db
    .prepare("SELECT event_id FROM demo_event_rsvp WHERE user_id = ?")
    .all(userId) as { event_id: string }[];
  return rows.map((row) => row.event_id);
}

export function demoUserHasRsvp(userId: string, eventId: string): boolean {
  const db = getDemoDb();
  const row = db
    .prepare("SELECT 1 FROM demo_event_rsvp WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId);
  return Boolean(row);
}

export function demoCreateEvent(userId: string, input: DemoEventCreateInput): HomeEvent {
  const db = getDemoDb();
  const resident = demoGetResidentForUser(userId);
  const title = input.title.trim();
  const location = input.location.trim();
  const startsAt = input.startsAt;
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);

  if (title.length < 3) {
    throw new Error("Title must be at least 3 characters.");
  }
  if (!location) {
    throw new Error("Location is required.");
  }
  const startMs = Date.parse(startsAt);
  if (Number.isNaN(startMs)) {
    throw new Error("Invalid start time.");
  }
  if (startMs <= Date.now()) {
    throw new Error("Start time must be in the future.");
  }

  const id = uniqueSlug(db, slugify(title));
  const glyph = inferGlyph(title, tags);
  const event: HomeEvent = {
    id,
    title,
    host: hostLabel(resident),
    hostIcon: hostIcon(glyph),
    startsAt: new Date(startMs).toISOString(),
    location,
    priceInr: 0,
    glyph,
    goingCount: 0,
    going: [],
    actionLabel: "RSVP",
    actionTone: "solid",
    href: `/events/${id}`,
  };

  upsertEvent(db, id, event);
  return event;
}

export function demoRsvpEvent(userId: string, eventId: string): HomeEvent {
  const db = getDemoDb();
  const existing = demoGetEventById(eventId);
  if (!existing) {
    throw new Error("Event not found.");
  }
  if (existing.priceInr > 0) {
    throw new Error("Paid events are not bookable yet.");
  }

  const already = db
    .prepare("SELECT 1 FROM demo_event_rsvp WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId);
  if (already) {
    return existing;
  }

  if (existing.goingCount >= DEMO_EVENT_CAPACITY) {
    throw new Error("This event is full.");
  }

  const resident = demoGetResidentForUser(userId);
  const person = personFromResident(resident);
  const going = [...(existing.going ?? [])];
  if (!going.some((p) => p.id === person.id)) {
    going.push(person);
  }

  const updated: HomeEvent = {
    ...existing,
    goingCount: existing.goingCount + 1,
    going,
    actionLabel: "Going",
    actionTone: "soft",
  };

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO demo_event_rsvp (event_id, user_id) VALUES (?, ?)").run(
      eventId,
      userId,
    );
    upsertEvent(db, eventId, updated);
  });
  tx();

  return updated;
}
