import type {
  BusinessAvailability,
  BusinessCard,
  BusinessCategory,
  BusinessServes,
  BusinessSort,
  OfferingUnit,
  StartingPrice,
  Weekday,
} from "@/lib/types/local-business";

export const BUSINESS_CATEGORY_LABEL: Record<BusinessCategory, string> = {
  food: "Food & tiffin",
  tuition: "Tuition & classes",
  childcare: "Childcare",
  pet_care: "Pet care",
  art: "Art & handmade",
  wellness: "Beauty & wellness",
  home_services: "Home services",
};

export const BUSINESS_CATEGORIES = Object.keys(BUSINESS_CATEGORY_LABEL) as BusinessCategory[];

export const BROWSE_CHIPS: ReadonlyArray<{ id: "all" | BusinessCategory; label: string }> = [
  { id: "all", label: "All" },
  ...BUSINESS_CATEGORIES.map((id) => ({ id, label: BUSINESS_CATEGORY_LABEL[id] })),
];

export const SORT_OPTIONS: ReadonlyArray<{ value: BusinessSort; label: string }> = [
  { value: "recommended", label: "Most recommended" },
  { value: "newest", label: "Newest" },
];

export const AVAILABILITY_LABEL: Record<BusinessAvailability, string> = {
  taking_orders: "Taking orders",
  fully_booked: "Fully booked",
  on_break: "On a break",
};

export const AVAILABILITY_TONE: Record<BusinessAvailability, "green" | "amber" | "quiet"> = {
  taking_orders: "green",
  fully_booked: "amber",
  on_break: "quiet",
};

export interface BrowseFilters {
  category: "all" | BusinessCategory;
  query: string;
  takingOrders: boolean;
  sort: BusinessSort;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  category: "all",
  query: "",
  takingOrders: false,
  sort: "recommended",
};

export function hasActiveFilters(filters: BrowseFilters): boolean {
  return filters.category !== "all" || filters.query.trim() !== "" || filters.takingOrders;
}

/** Query string for GET /v1/local-businesses. */
export function browseQueryString(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.takingOrders) params.set("taking_orders", "true");
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function rupees(amount: number): string {
  return RUPEES.format(amount);
}

const UNIT_SUFFIX: Record<OfferingUnit, string> = {
  each: " each",
  per_meal: "/meal",
  per_hour: "/hour",
  per_day: "/day",
  per_month: "/month",
};

export const UNIT_LABEL: Record<OfferingUnit, string> = {
  each: "each",
  per_meal: "per meal",
  per_hour: "per hour",
  per_day: "per day",
  per_month: "per month",
};

export const OFFERING_UNITS = Object.keys(UNIT_LABEL) as OfferingUnit[];

/** "₹120/meal" or "₹1,500 each". */
export function priceWithUnit(priceInr: number, unit: OfferingUnit): string {
  return `${rupees(priceInr)}${UNIT_SUFFIX[unit]}`;
}

/** "from ₹120/meal". */
export function startingPriceLabel(price: StartingPrice | null): string | null {
  return price ? `from ${priceWithUnit(price.priceInr, price.unit)}` : null;
}

export function recommendedLabel(count: number): string {
  if (count === 0) return "No recommendations yet";
  return `Recommended by ${count} ${count === 1 ? "neighbour" : "neighbours"}`;
}

/** "Lakshmi · Tower B". Always the tower, never a distance. */
export function ownerLine(card: Pick<BusinessCard, "ownerFirstName" | "tower">): string {
  return card.tower ? `${card.ownerFirstName} · ${card.tower}` : card.ownerFirstName;
}

/** Home shows featured businesses first, then the most recommended. */
export function homePicks(cards: BusinessCard[], limit: number): BusinessCard[] {
  const open = cards.filter((card) => card.reviewStatus === "approved");
  const featured = open.filter((card) => card.isFeatured);
  const rest = open.filter((card) => !card.isFeatured);
  return [...featured, ...rest].slice(0, limit);
}

export const SERVES_LABEL: Record<BusinessServes, string> = {
  within_society: "Within the society",
  all_towers: "Delivers to all towers",
};

const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** "Every day", "Mon to Fri" or "Sat, Sun". */
export function daysLabel(days: Weekday[]): string {
  const picked = WEEK.filter((day) => days.includes(day));
  if (picked.length === 7) return "Every day";
  const first = WEEK.indexOf(picked[0]);
  const contiguous = picked.every((day, index) => WEEK.indexOf(day) === first + index);
  if (picked.length >= 3 && contiguous) {
    return `${DAY_LABEL[picked[0]]} to ${DAY_LABEL[picked[picked.length - 1]]}`;
  }
  return picked.map((day) => DAY_LABEL[day]).join(", ");
}

export const WEEKDAYS = WEEK;
export const WEEKDAY_LABEL = DAY_LABEL;

/** "just now", "2h ago", "3d ago", then a short date. */
export function shortAgo(iso: string, now: Date = new Date()): string {
  const mins = Math.floor(Math.max(0, now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}
