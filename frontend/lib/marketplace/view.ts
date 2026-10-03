import type {
  ListingCategory,
  ListingCondition,
  ListingSort,
  MarketplaceCard,
} from "@/lib/types/marketplace";

export const LISTING_CATEGORY_LABEL: Record<ListingCategory, string> = {
  furniture: "Furniture",
  electronics: "Electronics",
  kids: "Kids",
  books: "Books",
  sports: "Sports & fitness",
  home_kitchen: "Home & kitchen",
};

export const LISTING_CONDITION_LABEL: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

export const LISTING_CATEGORIES = Object.keys(LISTING_CATEGORY_LABEL) as ListingCategory[];
export const LISTING_CONDITIONS = Object.keys(LISTING_CONDITION_LABEL) as ListingCondition[];

/** "Free" is a price filter rather than a category. */
export type BrowseCategory = "all" | "free" | ListingCategory;

export const BROWSE_CHIPS: ReadonlyArray<{ id: BrowseCategory; label: string }> = [
  { id: "all", label: "All" },
  ...LISTING_CATEGORIES.map((id) => ({ id, label: LISTING_CATEGORY_LABEL[id] })),
  { id: "free", label: "Free" },
];

export const SORT_OPTIONS: ReadonlyArray<{ value: ListingSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
];

export interface BrowseFilters {
  category: BrowseCategory;
  query: string;
  sort: ListingSort;
}

export const DEFAULT_FILTERS: BrowseFilters = { category: "all", query: "", sort: "newest" };

export function hasActiveFilters(filters: BrowseFilters): boolean {
  return filters.category !== "all" || filters.query.trim() !== "";
}

/** Query string for GET /v1/marketplace/listings. */
export function browseQueryString(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.category === "free") params.set("free", "true");
  else if (filters.category !== "all") params.set("category", filters.category);
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** "5 hours ago", "2 days ago", or a short date once it is over a month old. */
export function listedAgo(iso: string, now: Date = new Date()): string {
  const mins = Math.floor(Math.max(0, now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/** "Tower B · 2 days ago" */
export function cardMeta(card: Pick<MarketplaceCard, "tower" | "listedAt">, now?: Date): string {
  const when = listedAgo(card.listedAt, now);
  return card.tower ? `${card.tower} · ${when}` : when;
}
