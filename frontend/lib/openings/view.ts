import type {
  FlatOpeningCard,
  Furnishing,
  OpeningBudget,
  OpeningIncluded,
  OpeningKind,
  OpeningPreference,
  OpeningSort,
} from "@/lib/types/flat-opening";

export const KIND_LABEL: Record<OpeningKind, string> = {
  room_available: "Room available",
  flatmate_needed: "Flatmate needed",
  full_flat: "Full flat",
};

export const KIND_BLURB: Record<OpeningKind, string> = {
  room_available: "A private room in a shared flat, rented on its own.",
  flatmate_needed: "You live there and want someone to share your home and split costs.",
  full_flat: "The whole flat is for rent, with nobody else living there.",
};

export const KINDS = Object.keys(KIND_LABEL) as OpeningKind[];

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  furnished: "Furnished",
  semi_furnished: "Semi-furnished",
  unfurnished: "Unfurnished",
};

/** Shorter names for the filter chips. */
export const FURNISHING_CHIP: Record<Furnishing, string> = {
  furnished: "Furnished",
  semi_furnished: "Semi",
  unfurnished: "Unfurnished",
};

export const FURNISHINGS = Object.keys(FURNISHING_LABEL) as Furnishing[];

export const PREFERENCE_LABEL: Record<OpeningPreference, string> = {
  anyone: "Anyone",
  women_only: "Women only",
  men_only: "Men only",
  family: "Family",
  working_professionals: "Working professionals",
};

/** Rooms and flatmates are about who shares; a full flat is about who rents it. */
export const PREFERENCES_FOR: Record<OpeningKind, OpeningPreference[]> = {
  room_available: ["anyone", "women_only", "men_only"],
  flatmate_needed: ["anyone", "women_only", "men_only"],
  full_flat: ["anyone", "family", "working_professionals"],
};

export const INCLUDED_LABEL: Record<OpeningIncluded, string> = {
  wifi: "Wi-Fi",
  ac: "AC",
  parking: "Parking",
  power_backup: "Power backup",
  maid: "Maid",
  cook: "Cook",
  washing_machine: "Washing machine",
};

export const INCLUDED_ITEMS = Object.keys(INCLUDED_LABEL) as OpeningIncluded[];

export const BHK_OPTIONS = [1, 2, 3, 4] as const;

export const BUDGET_LABEL: Record<OpeningBudget, string> = {
  under_20k: "Under ₹20k",
  from_20k_to_40k: "₹20–40k",
  over_40k: "₹40k+",
};

export const BUDGETS = Object.keys(BUDGET_LABEL) as OpeningBudget[];

export const SORT_OPTIONS: ReadonlyArray<{ value: OpeningSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "rent_asc", label: "Rent low to high" },
];

export interface BrowseFilters {
  kind: OpeningKind | null;
  bhk: number | null;
  budget: OpeningBudget | null;
  furnishing: Furnishing | null;
  sort: OpeningSort;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  kind: null,
  bhk: null,
  budget: null,
  furnishing: null,
  sort: "newest",
};

export function hasActiveFilters(filters: BrowseFilters): boolean {
  return Boolean(filters.kind || filters.bhk || filters.budget || filters.furnishing);
}

export function browseQueryString(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.bhk) params.set("bhk", String(filters.bhk));
  if (filters.budget) params.set("budget", filters.budget);
  if (filters.furnishing) params.set("furnishing", filters.furnishing);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function bhkLabel(bhk: number): string {
  return `${bhk}${bhk >= 4 ? "+" : ""} BHK`;
}

/** Mirrors the API's title so the form preview shows what will be published. */
export function generateTitle(kind: OpeningKind, bhk: number, tower: string): string {
  const size = bhkLabel(bhk);
  if (kind === "room_available") return `Room in ${size} · ${tower}`;
  if (kind === "flatmate_needed") return `Flatmate for ${size} · ${tower}`;
  return `Entire ${size} · ${tower}`;
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatInr(amount: number): string {
  return `₹${inr.format(amount)}`;
}

export function formatRent(amount: number): string {
  return `${formatInr(amount)}/mo`;
}

export function maintenanceLabel(included: boolean, amount: number | null): string {
  return included || amount === null ? "Included" : `${formatInr(amount)}/mo`;
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

export function floorLabel(floor: number | null): string | null {
  if (floor === null) return null;
  return floor === 0 ? "Ground floor" : `${ordinal(floor)} floor`;
}

function dateParts(isoDate: string, options: Intl.DateTimeFormatOptions): string {
  // A date without a time is a calendar day: format it in UTC so no timezone shifts it.
  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 10)}T00:00:00Z`),
  );
}

export function availableLabel(isoDate: string | null): string {
  if (!isoDate) return "Available now";
  return `Available from ${dateParts(isoDate, { day: "numeric", month: "short" })}`;
}

export function availableLong(isoDate: string | null): string {
  if (!isoDate) return "Now";
  return dateParts(isoDate, { day: "numeric", month: "short", year: "numeric" });
}

/** "today", "yesterday", "3 days ago". Listings only live for 30 days. */
export function postedAgo(iso: string, now: Date = new Date()): string {
  const days = Math.floor(Math.max(0, now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function postedOn(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/** The facts shown as chips on a card, in order. */
export function cardFacts(opening: FlatOpeningCard): string[] {
  const facts = [FURNISHING_LABEL[opening.furnishing], availableLabel(opening.availableFrom)];
  facts.push(PREFERENCE_LABEL[opening.preference]);
  const floor = floorLabel(opening.floor);
  if (floor) facts.push(floor);
  return facts;
}
