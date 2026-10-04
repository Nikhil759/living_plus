import type { EventFormValues } from "@/lib/events/form";
import type { BusinessFormValues, OfferingRow } from "@/lib/local-businesses/form";
import type { ListingFormValues } from "@/lib/marketplace/form";
import type { OpeningFormValues } from "@/lib/openings/form";

/**
 * Fill with Saarthi returns values under each form's own field names (already cleaned by the
 * backend). These helpers keep only well-typed values so a surprise never reaches form state.
 */
type Raw = Record<string, unknown>;
type Kind = "string" | "number" | "boolean" | "strings";

function pick<T>(values: Raw, spec: Partial<Record<keyof T, Kind>>): Partial<T> {
  const out: Raw = {};
  for (const [key, kind] of Object.entries(spec) as [string, Kind][]) {
    const value = values[key];
    const ok =
      kind === "strings"
        ? Array.isArray(value) && value.every((item) => typeof item === "string")
        : kind === "number"
          ? typeof value === "number" && Number.isFinite(value)
          : typeof value === kind;
    if (ok) out[key] = value;
  }
  return out as Partial<T>;
}

export function eventFill(values: Raw): Partial<EventFormValues> {
  return pick<EventFormValues>(values, {
    title: "string",
    locationLabel: "string",
    startsAt: "string",
    endsAt: "string",
    description: "string",
    category: "string",
    capacity: "number",
    guestLimit: "number",
    whatToBring: "string",
    eventType: "string",
    priceInr: "number",
    inviteInterest: "string",
  });
}

export function listingFill(values: Raw): Partial<ListingFormValues> {
  return pick<ListingFormValues>(values, {
    title: "string",
    category: "string",
    condition: "string",
    price: "string",
    isFree: "boolean",
    negotiable: "boolean",
    description: "string",
    pickupNote: "string",
  });
}

export function businessFill(
  values: Raw,
  newRow: (row: Partial<OfferingRow>) => OfferingRow,
): Partial<BusinessFormValues> {
  const out = pick<BusinessFormValues>(values, {
    name: "string",
    category: "string",
    tagline: "string",
    about: "string",
    timings: "string",
    days: "strings",
    serves: "string",
  });
  if (Array.isArray(values.offerings)) {
    out.offerings = (values.offerings as Raw[])
      .filter((o) => o && typeof o.name === "string")
      .map((o) =>
        newRow({
          name: String(o.name),
          price: typeof o.price === "string" ? o.price : "",
          unit: (typeof o.unit === "string" ? o.unit : "each") as OfferingRow["unit"],
          note: typeof o.note === "string" ? o.note : "",
        }),
      );
  }
  return out;
}

export function openingFill(values: Raw): Partial<OpeningFormValues> {
  const out = pick<OpeningFormValues>(values, {
    kind: "string",
    floor: "string",
    furnishing: "string",
    rent: "string",
    deposit: "string",
    availableNow: "boolean",
    availableFrom: "string",
    preference: "string",
    included: "strings",
    description: "string",
  });
  if (typeof values.bhk === "number") out.bhk = values.bhk;
  return out;
}

export interface IssueFillValues {
  category: string;
  scope: string;
  tower: string;
  areaLabel: string;
  title: string;
  description: string;
  urgency: string;
}

export function issueFill(values: Raw): Partial<IssueFillValues> {
  return pick<IssueFillValues>(values, {
    category: "string",
    scope: "string",
    tower: "string",
    areaLabel: "string",
    title: "string",
    description: "string",
    urgency: "string",
  });
}

export interface GroupFillValues {
  name: string;
  emoji: string;
  description: string;
  visibility: string;
  /** The form's comma-separated interests text. */
  tags: string;
}

export function groupFill(values: Raw): Partial<GroupFillValues> {
  const out = pick<GroupFillValues>(values, {
    name: "string",
    emoji: "string",
    description: "string",
    visibility: "string",
  });
  if (Array.isArray(values.tags)) out.tags = values.tags.filter((t) => typeof t === "string").join(", ");
  return out;
}

export interface PostFillValues {
  body: string;
  postType: string;
  groupId: string;
}

/** Saarthi names a group; the form needs the id of one the resident has joined. */
export function postFill(values: Raw, groups: { id: string; name: string }[]): Partial<PostFillValues> {
  const out = pick<PostFillValues>(values, { body: "string", postType: "string" });
  const group = groups.find((g) => g.name === values.group);
  if (group) out.groupId = group.id;
  return out;
}

export interface FeedbackFillValues {
  topic: string;
  message: string;
  anonymous: boolean;
}

export function feedbackFill(values: Raw): Partial<FeedbackFillValues> {
  return pick<FeedbackFillValues>(values, { topic: "string", message: "string", anonymous: "boolean" });
}

/** True while a field still holds what Saarthi put there (so editing it removes the sparkle). */
export function stillFilled(filled: Raw, key: string, current: unknown): boolean {
  if (!(key in filled)) return false;
  const value = filled[key];
  const primitive = (v: unknown) => v === null || typeof v !== "object";
  if (primitive(value) && primitive(current)) return String(value) === String(current);
  return JSON.stringify(value) === JSON.stringify(current);
}

/** Edit mode sends the form's current values; photos and phone numbers stay out of the prompt. */
export function fillCurrent(values: object, skip: string[] = ["photos", "cover", "phone"]): Raw {
  return Object.fromEntries(Object.entries(values).filter(([key]) => !skip.includes(key)));
}

/** A filled start with no filled end keeps the event's length (2 hours if it had none). */
export function endForFilledStart(oldStart: string, oldEnd: string, newStart: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const length = new Date(oldEnd).getTime() - new Date(oldStart).getTime();
  const end = new Date(new Date(newStart).getTime() + (length > 0 ? length : 2 * 3_600_000));
  if (Number.isNaN(end.getTime())) return oldEnd;
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
}
