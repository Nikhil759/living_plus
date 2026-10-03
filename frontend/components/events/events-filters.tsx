import Link from "next/link";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL, EVENT_TABS, EVENT_TYPE_LABEL } from "@/lib/events/categories";
import { eventsListHref } from "@/lib/events/href";
import type { EventListQuery } from "@/lib/events/query";
import { cn } from "@/lib/utils";
import type { EventType } from "@/lib/types/home";

const TYPES: Array<EventType | "all"> = ["all", "free", "paid", "society"];

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium",
        active ? "bg-primary text-white" : "bg-quiet text-ink-secondary hover:bg-quiet",
      )}
    >
      {children}
    </Link>
  );
}

export function EventsFilters({ query }: { query: EventListQuery }) {
  const tab = query.tab ?? "upcoming";

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Event tabs">
        {EVENT_TABS.map((item) => (
          <FilterPill
            key={item.id}
            href={eventsListHref({ ...query, tab: item.id })}
            active={tab === item.id}
          >
            {item.label}
          </FilterPill>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2" aria-label="Event type">
        {TYPES.map((type) => (
          <FilterPill
            key={type}
            href={eventsListHref({ ...query, eventType: type })}
            active={(query.eventType ?? "all") === type}
          >
            {type === "all" ? "All" : EVENT_TYPE_LABEL[type]}
          </FilterPill>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Event category">
        <FilterPill href={eventsListHref({ ...query, category: "all" })} active={(query.category ?? "all") === "all"}>
          All
        </FilterPill>
        {EVENT_CATEGORIES.map((category) => (
          <FilterPill
            key={category}
            href={eventsListHref({ ...query, category })}
            active={query.category === category}
          >
            {EVENT_CATEGORY_LABEL[category]}
          </FilterPill>
        ))}
      </div>

      <form action="/events" method="get" className="flex gap-2">
        {tab !== "upcoming" ? <input type="hidden" name="tab" value={tab} /> : null}
        {query.eventType && query.eventType !== "all" ? (
          <input type="hidden" name="type" value={query.eventType} />
        ) : null}
        {query.category && query.category !== "all" ? (
          <input type="hidden" name="category" value={query.category} />
        ) : null}
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search events</span>
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Search title, description, or tags"
            className="w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-quiet px-4 text-callout font-semibold text-ink-secondary"
        >
          Search
        </button>
      </form>
    </div>
  );
}
