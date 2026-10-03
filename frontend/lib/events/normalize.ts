import { nextWeekday } from "@/lib/data/dates";
import type { EventCategory, EventStatus, EventType, HomeEvent } from "@/lib/types/home";

export interface EventSchedule {
  weekday: number;
  hour: number;
  minute?: number;
}

export type RawEvent = Omit<HomeEvent, "startsAt" | "endsAt"> & {
  schedule?: EventSchedule;
  daysOffset?: number;
  durationHours?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function startFromOffset(daysOffset: number, hour: number, minute: number): string {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const target = new Date(nowIst.getTime() + daysOffset * DAY_MS);
  target.setUTCHours(hour, minute, 0, 0);
  return new Date(target.getTime() - IST_OFFSET_MS).toISOString();
}

function inferType(event: Pick<HomeEvent, "priceInr" | "host" | "title">): EventType {
  if (event.priceInr > 0) return "paid";
  const blob = `${event.host} ${event.title}`.toLowerCase();
  if (blob.includes("committee") || blob.includes("rwa") || blob.includes("mela")) {
    return "society";
  }
  return "free";
}

function inferCategory(event: Pick<HomeEvent, "title" | "glyph" | "tags" | "location">): EventCategory {
  const blob = `${event.title} ${event.location} ${(event.tags ?? []).join(" ")} ${event.glyph}`.toLowerCase();
  if (/\b(kid|chess|child)\b/.test(blob)) return "kids";
  if (/\b(yoga|walk|fitness|wellness)\b/.test(blob)) return "fitness";
  if (/\b(food|mela|stall|chaat)\b/.test(blob)) return "food";
  if (/\b(salsa|mic|music|acoustic|bachata)\b/.test(blob)) return "music";
  if (/\b(book|pottery|workshop|learn)\b/.test(blob)) return "learning";
  if (/\b(fifa|ipl|ride|tennis|sport|game)\b/.test(blob)) return "sports";
  if (/\b(social|mixer|open mic)\b/.test(blob)) return "social";
  return "other";
}

function hostDisplayName(host: string): string {
  const cut = host.split(/·|\(/)[0]?.trim() ?? host;
  return cut.replace(/\s+hosting$/i, "").trim() || host;
}

export function normalizeEvent(raw: RawEvent): HomeEvent {
  const hour = raw.schedule?.hour ?? 10;
  const minute = raw.schedule?.minute ?? 0;
  const startsAt =
    raw.daysOffset != null
      ? startFromOffset(raw.daysOffset, hour, minute)
      : raw.schedule
        ? nextWeekday(raw.schedule.weekday, hour, minute)
        : new Date().toISOString();
  const durationHours = raw.durationHours ?? 2;
  const endsAt = new Date(Date.parse(startsAt) + durationHours * 60 * 60 * 1000).toISOString();
  const eventType = raw.eventType ?? inferType(raw);
  const category = raw.category ?? inferCategory(raw);
  const status: EventStatus = raw.status ?? "published";
  const capacity = raw.capacity ?? Math.max(raw.goingCount + 8, 20);
  const { schedule: _schedule, daysOffset: _daysOffset, durationHours: _duration, ...rest } = raw;
  void _schedule;
  void _daysOffset;
  void _duration;

  return {
    ...rest,
    startsAt,
    endsAt,
    eventType,
    category,
    status,
    capacity,
    tags: raw.tags ?? [],
    hostName: raw.hostName ?? hostDisplayName(raw.host),
  };
}

export function materializeEvents(raw: RawEvent[]): HomeEvent[] {
  return raw.map(normalizeEvent);
}
