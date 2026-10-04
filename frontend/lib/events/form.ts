import type { EventCategory, EventRecurrence, EventType, HomeEvent, StallCategory } from "@/lib/types/home";
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
  recurrence: EventRecurrence;
  recurrenceCount: number;
  stallsEnabled: boolean;
  stallCount: number;
  stallFeeInr: number;
  stallCategoriesText: string;
  stallDeadline: string;
  /** New events only: residents with this interest are invited once it's published. */
  inviteInterest: string;
}

export function parseStallCategories(value: string): StallCategory[] {
  const seen = new Set<string>();
  const out: StallCategory[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const sep = trimmed.lastIndexOf(":");
    const name = (sep > 0 ? trimmed.slice(0, sep) : trimmed).trim();
    const limitRaw = sep > 0 ? Number(trimmed.slice(sep + 1)) : NaN;
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      limit: Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    });
  }
  return out;
}

export function formatStallCategories(categories: StallCategory[] | undefined): string {
  return (categories ?? [])
    .map((item) => (item.limit ? `${item.name}:${item.limit}` : item.name))
    .join(", ");
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
    recurrence: event?.recurrence && event.recurrence !== "none" ? event.recurrence : "none",
    recurrenceCount: 4,
    stallsEnabled: Boolean(event?.stallsEnabled),
    stallCount: event?.stallCount ?? 10,
    stallFeeInr: event?.stallFeeInr && event.stallFeeInr > 0 ? event.stallFeeInr : 0,
    stallCategoriesText: formatStallCategories(event?.stallCategories),
    stallDeadline: event?.stallApplicationDeadline ? toLocalInput(event.stallApplicationDeadline) : "",
    inviteInterest: "",
  };
}

export function eventFormPayload(values: EventFormValues, extra: { saveAsDraft?: boolean; publish?: boolean; amenityId?: string }) {
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
    recurrence: values.recurrence,
    recurrenceCount: values.recurrence === "none" ? undefined : values.recurrenceCount,
    stallsEnabled: values.eventType === "society" && values.stallsEnabled,
    stallCount: values.eventType === "society" && values.stallsEnabled ? values.stallCount : undefined,
    stallFeeInr: values.eventType === "society" && values.stallsEnabled ? values.stallFeeInr : undefined,
    stallCategories:
      values.eventType === "society" && values.stallsEnabled
        ? parseStallCategories(values.stallCategoriesText)
        : undefined,
    stallApplicationDeadline:
      values.eventType === "society" && values.stallsEnabled && values.stallDeadline
        ? new Date(values.stallDeadline).toISOString()
        : undefined,
    inviteInterest: values.inviteInterest.trim() || undefined,
    ...extra,
  };
}
