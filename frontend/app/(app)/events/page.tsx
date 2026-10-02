import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { EventCard } from "@/components/home/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { loadEvents } from "@/lib/data";

export default async function EventsPage() {
  const events = await loadEvents();

  return (
    <AppPage title="Events">
      <div className="flex items-end justify-between gap-4">
        <p className="text-body text-ink-secondary">Free, paid, and society gatherings nearby.</p>
        <Link href="/events/new" className="text-callout font-semibold text-primary">
          Host
        </Link>
      </div>
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
        <div className="grid gap-5 sm:grid-cols-2">
          {events.map(({ id, ...event }) => (
            <EventCard key={id} {...event} className="w-full" />
          ))}
        </div>
      )}
    </AppPage>
  );
}
