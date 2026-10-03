import type { EventCategory, EventListTab, EventType } from "@/lib/types/home";

export const EVENT_CATEGORIES: EventCategory[] = [
  "sports",
  "fitness",
  "kids",
  "food",
  "music",
  "learning",
  "social",
  "other",
];

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  sports: "Sports",
  fitness: "Fitness",
  kids: "Kids",
  food: "Food",
  music: "Music",
  learning: "Learning",
  social: "Social",
  other: "Other",
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  free: "Free",
  paid: "Paid",
  society: "Society",
};

export const EVENT_TABS: { id: EventListTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "going", label: "Going" },
  { id: "hosting", label: "Hosting" },
  { id: "past", label: "Past" },
];

export function categoryCoverSrc(category: EventCategory = "other"): string {
  return `/images/events/covers/${category}.svg`;
}
