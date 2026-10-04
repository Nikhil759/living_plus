import type { EventFormValues } from "@/lib/events/form";
import type { BusinessFormValues } from "@/lib/local-businesses/form";
import type { ListingFormValues } from "@/lib/marketplace/form";
import type { EventCategory, EventType } from "@/lib/types/home";
import type { BusinessCategory } from "@/lib/types/local-business";
import type { ListingCategory, ListingCondition } from "@/lib/types/marketplace";

/** A Saarthi proposal (GET /v1/saarthi/actions/:id) used to prefill the normal form ("Edit"). */
export interface SaarthiDraft {
  tool: string;
  payload: Record<string, unknown>;
}

type Raw = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** ISO time → "YYYY-MM-DDTHH:MM" wall clock in IST, for datetime-local inputs. */
export function istLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function eventPrefill(draft: SaarthiDraft): Partial<EventFormValues> | undefined {
  if (draft.tool !== "create_event") return undefined;
  const body = (draft.payload.body ?? {}) as Raw;
  const prefill: Partial<EventFormValues> = {
    title: text(body.title),
    locationLabel: text(body.location_label),
    description: text(body.description),
    category: (text(body.category) || "other") as EventCategory,
    capacity: num(body.capacity, 50),
    eventType: (text(body.event_type) || "free") as EventType,
    inviteInterest: text(body.invite_interest),
  };
  if (typeof body.price_inr === "number") prefill.priceInr = body.price_inr;
  if (text(body.starts_at)) prefill.startsAt = istLocalInput(text(body.starts_at));
  if (text(body.ends_at)) prefill.endsAt = istLocalInput(text(body.ends_at));
  return prefill;
}

export function listingPrefill(draft: SaarthiDraft): Partial<ListingFormValues> | undefined {
  if (draft.tool !== "create_listing") return undefined;
  const d = (draft.payload.draft ?? {}) as Raw;
  const price = num(d.price_inr, 0);
  return {
    title: text(d.title),
    category: text(d.category) as ListingCategory,
    condition: (text(d.condition) || "good") as ListingCondition,
    price: price > 0 ? String(price) : "",
    isFree: price === 0,
    negotiable: Boolean(d.negotiable),
    description: text(d.description),
  };
}

export function businessPrefill(draft: SaarthiDraft): Partial<BusinessFormValues> | undefined {
  if (draft.tool !== "start_business_listing") return undefined;
  const d = (draft.payload.draft ?? {}) as Raw;
  return {
    name: text(d.name),
    category: text(d.category) as BusinessCategory,
    tagline: text(d.tagline),
    about: text(d.about),
    timings: text(d.timings),
  };
}
