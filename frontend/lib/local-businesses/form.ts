import { moveItem } from "@/lib/marketplace/form";
import type {
  BusinessCard,
  BusinessCategory,
  BusinessContactMethod,
  BusinessDetail,
  BusinessServes,
  OfferingUnit,
  Weekday,
} from "@/lib/types/local-business";

export { moveItem };

export const MAX_NAME = 50;
export const MAX_TAGLINE = 80;
export const MAX_ABOUT = 600;
export const MAX_GALLERY = 6;
export const MAX_OFFERINGS = 10;
export const MAX_OFFERING_NAME = 60;
export const MAX_OFFERING_NOTE = 60;
export const MAX_TIMINGS = 80;
export const MAX_PRICE_INR = 10_000_000;

export interface OfferingRow {
  /** Stable React key; never sent to the API. */
  key: string;
  name: string;
  /** Digits only, kept as text so a half-typed value is never lost. */
  price: string;
  unit: OfferingUnit;
  note: string;
}

export interface BusinessFormValues {
  name: string;
  category: BusinessCategory | "";
  tagline: string;
  /** At most one; held as a list so it can use the photo picker. */
  cover: string[];
  photos: string[];
  about: string;
  offerings: OfferingRow[];
  timings: string;
  days: Weekday[];
  serves: BusinessServes | "";
  contactMethod: BusinessContactMethod;
  phone: string;
}

export type BusinessFormField = keyof BusinessFormValues;
export type BusinessFormErrors = Partial<Record<BusinessFormField, string>>;

let rowSeq = 0;
export function newOfferingRow(overrides: Partial<OfferingRow> = {}): OfferingRow {
  rowSeq += 1;
  return { key: `row-${rowSeq}`, name: "", price: "", unit: "each", note: "", ...overrides };
}

export function emptyBusinessForm(): BusinessFormValues {
  return {
    name: "",
    category: "",
    tagline: "",
    cover: [],
    photos: [],
    about: "",
    offerings: [newOfferingRow()],
    timings: "",
    days: [],
    serves: "",
    contactMethod: "whatsapp",
    phone: "",
  };
}

export function businessFormFrom(business: BusinessDetail): BusinessFormValues {
  return {
    name: business.name,
    category: business.category,
    tagline: business.tagline,
    cover: [business.coverUrl],
    photos: business.photos,
    about: business.about ?? "",
    offerings: business.offerings.map((offering) =>
      newOfferingRow({
        name: offering.name,
        price: String(offering.priceInr),
        unit: offering.unit,
        note: offering.note ?? "",
      }),
    ),
    timings: business.timings,
    days: business.days,
    serves: business.serves,
    contactMethod: business.contactMethod,
    phone: "",
  };
}

function cleanPhone(phone: string): string {
  return phone.replace(/[\s-]/g, "");
}

/** The first problem found in the offering rows, or undefined when they are fine. */
function offeringsError(rows: OfferingRow[]): string | undefined {
  if (rows.length === 0) return "Add at least one offering.";
  for (const row of rows) {
    const name = row.name.trim();
    const price = Number(row.price);
    if (!name) return "Give every offering a name.";
    if (name.length > MAX_OFFERING_NAME) return `Keep offering names to ${MAX_OFFERING_NAME} characters or fewer.`;
    if (!row.price || price <= 0) return "Give every offering a price.";
    if (price > MAX_PRICE_INR) return "That price is too high. Enter an amount up to ₹1,00,00,000.";
    if (row.note.trim().length > MAX_OFFERING_NOTE) {
      return `Keep offering notes to ${MAX_OFFERING_NOTE} characters or fewer.`;
    }
  }
  return undefined;
}

export function validateBusinessForm(
  values: BusinessFormValues,
  options: { needsPhone: boolean },
): BusinessFormErrors {
  const errors: BusinessFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Give your business a name.";
  else if (name.length > MAX_NAME) errors.name = `Keep the name to ${MAX_NAME} characters or fewer.`;
  if (!values.category) errors.category = "Pick a category.";
  const tagline = values.tagline.trim();
  if (!tagline) errors.tagline = "Add a one-line tagline.";
  else if (tagline.length > MAX_TAGLINE) errors.tagline = `Keep the tagline to ${MAX_TAGLINE} characters or fewer.`;
  if (values.cover.length === 0) errors.cover = "Add a cover photo.";
  if (values.about.trim().length > MAX_ABOUT) errors.about = `Keep this to ${MAX_ABOUT} characters or fewer.`;
  const offerings = offeringsError(values.offerings);
  if (offerings) errors.offerings = offerings;
  const timings = values.timings.trim();
  if (!timings) errors.timings = "Say when you are available, e.g. 11 AM to 2 PM.";
  else if (timings.length > MAX_TIMINGS) errors.timings = `Keep this to ${MAX_TIMINGS} characters or fewer.`;
  if (values.days.length === 0) errors.days = "Pick at least one day.";
  if (!values.serves) errors.serves = "Say where you serve.";
  if (options.needsPhone && !/^\+?[0-9]{10,15}$/.test(cleanPhone(values.phone))) {
    errors.phone = "Enter a valid phone number, for example 98765 43210.";
  }
  return errors;
}

/** Body for POST/PUT /v1/local-businesses. Call only after validation passes. */
export function businessPayload(values: BusinessFormValues) {
  const phone = cleanPhone(values.phone);
  return {
    name: values.name.trim(),
    category: values.category as BusinessCategory,
    tagline: values.tagline.trim(),
    about: values.about.trim() || null,
    coverUrl: values.cover[0],
    photos: values.photos,
    offerings: values.offerings.map((row) => ({
      name: row.name.trim(),
      priceInr: Number(row.price),
      unit: row.unit,
      note: row.note.trim() || null,
    })),
    timings: values.timings.trim(),
    days: values.days,
    serves: values.serves as BusinessServes,
    contactMethod: values.contactMethod,
    phone: phone || undefined,
  };
}

/** The live preview card, built from whatever has been typed so far. */
export function previewBusinessCard(
  values: BusinessFormValues,
  owner: { firstName: string; tower: string | null },
): BusinessCard {
  const prices = values.offerings
    .filter((row) => Number(row.price) > 0)
    .map((row) => ({ priceInr: Number(row.price), unit: row.unit }));
  const cheapest = prices.reduce<(typeof prices)[number] | null>(
    (best, item) => (best === null || item.priceInr < best.priceInr ? item : best),
    null,
  );
  return {
    id: "preview",
    name: values.name.trim() || "Your business name",
    category: values.category || "food",
    tagline: values.tagline.trim() || "A one-line tagline",
    coverUrl: values.cover[0] ?? "",
    ownerFirstName: owner.firstName,
    tower: owner.tower,
    startingPrice: cheapest,
    recommendationCount: 0,
    availability: "taking_orders",
    reviewStatus: "approved",
    isFeatured: false,
    isMine: true,
    createdAt: new Date().toISOString(),
  };
}

export function toggleDay(days: Weekday[], day: Weekday): Weekday[] {
  return days.includes(day) ? days.filter((item) => item !== day) : [...days, day];
}
