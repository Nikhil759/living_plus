import type { EventCategory, EventType, HomeEvent } from "@/lib/types/home";
import { EVENT_CATEGORIES } from "@/lib/events/categories";

export interface EventFormValues {
  title: string;
  locationLabel: string;
  startsAt: string;
  endsAt: string;
  description: string;
  category: EventCategory;
  capacity: number;
  guestLimit: number;
  whatToBring: string;
  coverUrl: string;
  tags: string[];
  eventType: EventType;
  priceInr: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toLocalInput(iso?: string, addHours = 0): string {
  const d = iso ? new Date(iso) : new Date();
  if (!iso) {
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
  }
  if (addHours) d.setHours(d.getHours() + addHours);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addHoursToLocalInput(value: string, hours: number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  d.setHours(d.getHours() + hours);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseTagList(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function eventFormDefaults(event?: HomeEvent): EventFormValues {
  return {
    title: event?.title ?? "",
    locationLabel: event?.location ?? "",
    startsAt: toLocalInput(event?.startsAt),
    endsAt: toLocalInput(event?.endsAt ?? event?.startsAt, event?.endsAt ? 0 : 2),
    description: event?.description ?? "",
    category: event?.category && EVENT_CATEGORIES.includes(event.category) ? event.category : "other",
    capacity: event?.capacity ?? 50,
    guestLimit: event?.guestLimit ?? 0,
    whatToBring: event?.whatToBring ?? "",
    coverUrl: event?.imageUrl ?? "",
    tags: event?.tags ?? [],
    eventType: event?.eventType ?? "free",
    priceInr: event?.priceInr && event.priceInr > 0 ? event.priceInr : 250,
  };
}

export function eventFormPayload(values: EventFormValues, extra: { saveAsDraft?: boolean; publish?: boolean }) {
  return {
    title: values.title.trim(),
    locationLabel: values.locationLabel.trim(),
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    description: values.description.trim() || null,
    category: values.category,
    capacity: values.capacity,
    guestLimit: values.guestLimit,
    whatToBring: values.whatToBring.trim() || null,
    coverUrl: values.coverUrl.trim() || null,
    tags: values.tags,
    eventType: values.eventType,
    priceInr: values.eventType === "paid" ? values.priceInr : undefined,
    ...extra,
  };
}
