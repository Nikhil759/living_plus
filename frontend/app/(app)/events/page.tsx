import Link from "next/link";
import { CalendarPlus, Sparkles } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EventsEmpty } from "@/components/events/events-empty";
import { EventsFilters } from "@/components/events/events-filters";
import { AppPage } from "@/components/layout/app-page";
import { SectionHeader } from "@/components/home/section-header";
import { buttonVariants } from "@/components/ui/button";
import { loadEventList } from "@/lib/data";
import { parseEventsListQuery } from "@/lib/events/href";
import { groupUpcoming } from "@/lib/events/query";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

interface EventsPageProps {
  searchParams: Promise<{ tab?: string; type?: string; category?: string; q?: string }>;
}

function EventGrid({ events }: { events: HomeEvent[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
      {events.map(({ id, ...event }) => (
        <li key={id} className="min-w-0">
          <EventCard {...event} layout="fill" />
        </li>
      ))}
    </ul>
  );
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const raw = await searchParams;
  const query = parseEventsListQuery(raw);
  const tab = query.tab ?? "upcoming";
  const events = await loadEventList(query);

  return (
    <AppPage title="Events">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 border-b border-outline-variant/25 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <p className="max-w-xl text-body text-ink-secondary">
            Free, paid, and society gatherings nearby.
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/events/new?describe=1"
              className={cn(
                buttonVariants({ variant: "secondary", size: "md" }),
                "inline-flex w-full items-center justify-center gap-2 sm:w-auto",
              )}
            >
              <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              Describe an event
            </Link>
            <Link
              href="/events/new"
              className={cn(
                buttonVariants({ variant: "primary", size: "md" }),
                "inline-flex w-full items-center justify-center gap-2 sm:w-auto sm:me-2 lg:me-4",
              )}
            >
              <CalendarPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              Host an event
            </Link>
          </div>
        </div>

        <EventsFilters query={query} />

        {events.length === 0 ? (
          <EventsEmpty tab={tab} />
        ) : tab === "upcoming" ? (
          <div className="space-y-8">
            {groupUpcoming(events).map((group) => (
              <section key={group.id} className="space-y-4">
                <SectionHeader title={group.label} />
                <EventGrid events={group.events} />
              </section>
            ))}
          </div>
        ) : (
          <EventGrid events={events} />
        )}
      </div>
    </AppPage>
  );
}
