import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { EventCard } from "@/components/home/event-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadEvents } from "@/lib/data";
import { cn } from "@/lib/utils";

export default async function EventsPage() {
  const events = await loadEvents();

  return (
    <AppPage title="Events">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 border-b border-outline-variant/25 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <p className="max-w-xl text-body text-ink-secondary">
            Free, paid, and society gatherings nearby.
          </p>
          <Link
            href="/events/new"
            className={cn(
              buttonVariants({ variant: "primary", size: "md" }),
              "inline-flex w-full shrink-0 items-center justify-center gap-2 sm:mt-0.5 sm:w-auto sm:me-2 lg:me-4",
            )}
          >
            <CalendarPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            Host an event
          </Link>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus />}
            title="Nothing planned yet"
            action={
              <Link
                href="/events/new"
                className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-flex gap-2")}
              >
                <CalendarPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                Host an event
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {events.map(({ id, ...event }) => (
              <li key={id} className="min-w-0">
                <EventCard {...event} layout="fill" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPage>
  );
}
