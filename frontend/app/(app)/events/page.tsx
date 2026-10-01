import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { EventCard } from "@/components/home/event-card";
import { buttonVariants } from "@/components/ui/button";
import { mockEvents } from "@/lib/mock/events";

export default function EventsPage() {
  return (
    <AppPage title="Events">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-md text-on-surface-variant">
          Free, paid, and society events in your neighbourhood.
        </p>
        <Link href="/events/new" className={buttonVariants({ size: "sm" })}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Host
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {mockEvents.map(({ id, ...event }) => (
          <EventCard key={id} {...event} className="w-full shrink" />
        ))}
      </div>
    </AppPage>
  );
}
