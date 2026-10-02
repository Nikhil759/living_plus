import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { EventCard } from "@/components/home/event-card";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { HomeEvent } from "@/lib/types/home";

export function EventsSection({ events }: { events: HomeEvent[] }) {
  return (
    <section className="space-y-5">
      <SectionHeader
        title="Happening soon"
        action={events.length > 0 ? { label: "See all", href: "/events" } : undefined}
      />
      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus />}
          title="Nothing planned yet"
          action={
            <Link href="/events/new" className="text-callout font-semibold text-primary">
              Host an event
            </Link>
          }
        />
      ) : (
        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 no-scrollbar lg:mx-0 lg:px-0">
          {events.map(({ id, ...event }) => (
            <EventCard key={id} {...event} />
          ))}
        </div>
      )}
    </section>
  );
}
