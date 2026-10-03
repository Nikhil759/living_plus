import type {
  ListingCategory,
  ListingCondition,
  ListingContactMethod,
  MarketplaceListing,
} from "@/lib/types/marketplace";

export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 500;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PRICE_INR = 10_000_000;
export const DEFAULT_PICKUP_NOTE = "Pickup in society";

export interface ListingFormValues {
  photos: string[];
  title: string;
  category: ListingCategory | "";
  condition: ListingCondition | "";
  /** Digits only, kept as text so a half-typed value is never lost. */
  price: string;
  isFree: boolean;
  negotiable: boolean;
  description: string;
  contactMethod: ListingContactMethod;
  pickupNote: string;
  phone: string;
}

export type ListingFormField = keyof ListingFormValues;
export type ListingFormErrors = Partial<Record<ListingFormField, string>>;

export function emptyListingForm(): ListingFormValues {
  return {
    photos: [],
    title: "",
    category: "",
    condition: "",
    price: "",
    isFree: false,
    negotiable: false,
    description: "",
    contactMethod: "whatsapp",
    pickupNote: DEFAULT_PICKUP_NOTE,
    phone: "",
  };
}

export function listingFormFrom(listing: MarketplaceListing): ListingFormValues {
  return {
    photos: listing.photos,
    title: listing.title,
    category: listing.category,
    condition: listing.condition,
    price: listing.isFree ? "" : String(listing.priceInr),
    isFree: listing.isFree,
    negotiable: listing.negotiable,
    description: listing.description ?? "",
    contactMethod: listing.contactMethod,
    pickupNote: listing.pickupNote,
    phone: "",
  };
}

function cleanPhone(phone: string): string {
  return phone.replace(/[\s-]/g, "");
}

export function validateListingForm(
  values: ListingFormValues,
  options: { needsPhone: boolean },
): ListingFormErrors {
  const errors: ListingFormErrors = {};
  if (values.photos.length === 0) errors.photos = "Add at least one photo.";
  const title = values.title.trim();
  if (!title) errors.title = "Give your item a title.";
  else if (title.length > MAX_TITLE) errors.title = `Keep the title to ${MAX_TITLE} characters or fewer.`;
  if (!values.category) errors.category = "Pick a category.";
  if (!values.condition) errors.condition = "Pick a condition.";
  if (!values.isFree) {
    const price = Number(values.price);
    if (!values.price || price <= 0) errors.price = "Enter a price, or tick \"Giving it away for free\".";
    else if (price > MAX_PRICE_INR) errors.price = "That price is too high. Enter an amount up to ₹1,00,00,000.";
  }
  if (values.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `Keep the description to ${MAX_DESCRIPTION} characters or fewer.`;
  }
  if (!values.pickupNote.trim()) errors.pickupNote = "Add a pickup note, e.g. \"Pickup in society\".";
  if (options.needsPhone && !/^\+?[0-9]{10,15}$/.test(cleanPhone(values.phone))) {
    errors.phone = "Enter a valid phone number, for example 98765 43210.";
  }
  return errors;
}

/** Body for POST/PUT /v1/marketplace/listings. Call only after validation passes. */
export function listingPayload(values: ListingFormValues) {
  const phone = cleanPhone(values.phone);
  return {
    title: values.title.trim(),
    category: values.category as ListingCategory,
    condition: values.condition as ListingCondition,
    priceInr: values.isFree ? 0 : Number(values.price),
    isFree: values.isFree,
    negotiable: values.isFree ? false : values.negotiable,
    description: values.description.trim() || null,
    photos: values.photos,
    contactMethod: values.contactMethod,
    pickupNote: values.pickupNote.trim(),
    phone: phone || undefined,
  };
}

/** Moves one item, for drag-to-reorder. Out-of-range moves return the list unchanged. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
