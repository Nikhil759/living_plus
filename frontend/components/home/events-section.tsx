import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/home/event-card";
import { SectionHeader } from "@/components/home/section-header";
import type { HomeEvent } from "@/lib/types/home";

export interface EventsSectionProps {
  events: HomeEvent[];
}

export function EventsSection({ events }: EventsSectionProps) {
  return (
    <section className="space-y-3 lg:space-y-4">
      <SectionHeader
        title="Happening soon"
        subtitle="Meet neighbours & join community circles"
        action={events.length > 0 ? { label: "See all", href: "/events" } : undefined}
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-6 w-6" aria-hidden="true" />}
          title="Nothing planned yet"
          description="Be the first to get the neighbourhood together — a game night, a ride, a chai meetup."
          action={
            <Link
              href="/events/new"
              className={buttonVariants({ size: "md", variant: "solid" })}
            >
              Host an event
            </Link>
          }
        />
      ) : (
        <div
          className={
            // Mobile: edge-to-edge snap carousel (inner padding keeps the first card aligned).
            // Desktop: a regular 2-column grid, no scrolling.
            "-mx-margin flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-margin pb-1 pt-0.5 scroll-pl-margin no-scrollbar " +
            "lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0"
          }
        >
          {events.map(({ id, ...event }) => (
            <EventCard key={id} {...event} />
          ))}
        </div>
      )}
    </section>
  );
}
