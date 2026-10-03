import Link from "next/link";
import { CalendarPlus, CalendarSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { eventsListHref } from "@/lib/events/href";
import { cn } from "@/lib/utils";
import type { EventListTab } from "@/lib/types/home";

const COPY: Record<EventListTab, { title: string; actionLabel: string; href: string }> = {
  upcoming: { title: "Nothing planned yet", actionLabel: "Host an event", href: "/events/new" },
  going: { title: "You're not going to any events yet", actionLabel: "Browse upcoming", href: eventsListHref({}) },
  hosting: { title: "You're not hosting anything yet", actionLabel: "Host an event", href: "/events/new" },
  past: { title: "No past events yet", actionLabel: "Browse upcoming", href: eventsListHref({}) },
};

export function EventsEmpty({ tab }: { tab: EventListTab }) {
  const copy = COPY[tab];
  const Icon = tab === "upcoming" || tab === "hosting" ? CalendarPlus : CalendarSearch;
  return (
    <EmptyState
      icon={<Icon />}
      title={copy.title}
      action={
        <Link
          href={copy.href}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-flex gap-2")}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          {copy.actionLabel}
        </Link>
      }
    />
  );
}
