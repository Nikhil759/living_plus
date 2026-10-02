import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { formatEventWhen, formatPriceInr } from "@/lib/format";
import type { HomeEvent } from "@/lib/types/home";

interface ProfileMyEventsProps {
  events: HomeEvent[];
}

export function ProfileMyEvents({ events }: ProfileMyEventsProps) {
  return (
    <section className="space-y-4">
      <SectionHeader title="My events" action={{ label: "See all", href: "/events" }} />
      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No upcoming events"
          action={
            <Link href="/events/new" className="text-callout font-semibold text-primary">
              Host an event
            </Link>
          }
        />
      ) : (
        <GroupedList>
          {events.map((event) => (
            <ListRow
              key={event.id}
              href={event.href}
              title={event.title}
              detail={`${formatEventWhen(event.startsAt)} · ${event.location} · ${formatPriceInr(event.priceInr)}`}
              trailing={
                event.goingCount > 0 ? (
                  <span className="shrink-0 text-caption text-ink-tertiary">{event.goingCount} going</span>
                ) : undefined
              }
              className="lg:[&>div]:py-4"
              leading={
                <IconTile tone="quiet">
                  <CalendarDays />
                </IconTile>
              }
            />
          ))}
        </GroupedList>
      )}
    </section>
  );
}
