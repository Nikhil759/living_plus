import type { EventListQuery } from "@/lib/events/query";

export function eventsListHref(query: EventListQuery): string {
  const params = new URLSearchParams();
  if (query.tab && query.tab !== "upcoming") params.set("tab", query.tab);
  if (query.eventType && query.eventType !== "all") params.set("type", query.eventType);
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.q?.trim()) params.set("q", query.q.trim());
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}

export function parseEventsListQuery(searchParams: {
  tab?: string;
  type?: string;
  category?: string;
  q?: string;
}): EventListQuery {
  const tab = searchParams.tab;
  const eventType = searchParams.type;
  const category = searchParams.category;
  return {
    tab:
      tab === "going" || tab === "hosting" || tab === "past" || tab === "upcoming"
        ? tab
        : "upcoming",
    eventType:
      eventType === "free" || eventType === "paid" || eventType === "society" ? eventType : "all",
    category:
      category === "sports" ||
      category === "fitness" ||
      category === "kids" ||
      category === "food" ||
      category === "music" ||
      category === "learning" ||
      category === "social" ||
      category === "other"
        ? category
        : "all",
    q: searchParams.q?.trim() ?? "",
  };
}
