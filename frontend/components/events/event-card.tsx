import Link from "next/link";
import { EventCover } from "@/components/events/event-cover";
import { AvatarStack } from "@/components/home/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { eventStatusPills } from "@/lib/events/query";
import { formatEventWhen, formatPriceInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

export function EventCard({
  title,
  startsAt,
  location,
  priceInr,
  imageUrl,
  goingCount,
  going,
  href,
  host,
  hostName,
  category,
  layout = "rail",
  className,
  ...event
}: Omit<HomeEvent, "id"> & { className?: string; layout?: "rail" | "fill" }) {
  const publicGoing = (going ?? []).filter((person) => person.isVisible !== false);
  const pills = eventStatusPills({
    status: event.status,
    capacity: event.capacity,
    goingCount,
    viewerGoing: event.viewerGoing,
    isHost: event.isHost,
    isCommittee: event.isCommittee,
  });

  return (
    <Link
      href={href}
      className={cn(
        "group overflow-hidden rounded-card bg-card shadow-card",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
        layout === "rail" && "w-[280px] shrink-0 snap-start lg:w-[320px]",
        layout === "fill" && "min-w-0 w-full",
        className,
      )}
    >
      <div className="relative">
        <EventCover
          title={title}
          imageUrl={imageUrl}
          category={category}
          sizes={layout === "fill" ? "(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw" : "320px"}
        />
        <span className="glass absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-caption font-semibold text-ink">
          {formatPriceInr(priceInr)}
        </span>
      </div>
      <div className="space-y-2 p-5">
        {pills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {pills.map((pill) => (
              <Badge key={pill}>{pill}</Badge>
            ))}
          </div>
        ) : null}
        <h3 className="text-headline text-ink">{title}</h3>
        <p className="text-caption text-ink-tertiary">{formatEventWhen(startsAt)}</p>
        <p className="text-caption text-ink-secondary">{location}</p>
        <p className="text-caption text-ink-tertiary">{hostName ?? host}</p>
        <div className="flex items-center gap-2">
          {publicGoing.length > 0 ? <AvatarStack people={publicGoing} total={goingCount} size="xs" /> : null}
          <p className="text-caption text-ink-secondary">{goingCount} neighbours going</p>
        </div>
      </div>
    </Link>
  );
}
