import Image from "next/image";
import Link from "next/link";
import {
  Bike,
  CalendarDays,
  Clock,
  Flower2,
  Gamepad2,
  Music,
  Navigation,
  PartyPopper,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEventWhen, formatPriceInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventGlyph, EventHostIcon, HomeEvent } from "@/lib/types/home";

const GLYPHS: Record<EventGlyph, LucideIcon> = {
  ride: Bike,
  game: Gamepad2,
  music: Music,
  wellness: Flower2,
  general: CalendarDays,
};

const HOST_ICONS: Record<EventHostIcon, LucideIcon> = {
  person: User,
  celebration: PartyPopper,
  club: Navigation,
};

export interface EventCardProps extends Omit<HomeEvent, "id"> {
  className?: string;
}

export function EventCard({
  title,
  host,
  hostIcon,
  startsAt,
  location,
  priceInr,
  imageUrl,
  imageAlt,
  glyph,
  goingCount,
  actionLabel,
  actionTone,
  href,
  className,
}: EventCardProps) {
  const Glyph = GLYPHS[glyph];
  const HostIcon = HOST_ICONS[hostIcon];
  const isFree = priceInr <= 0;

  return (
    <Card
      as="article"
      className={cn(
        "group flex w-[270px] shrink-0 snap-start flex-col overflow-hidden",
        // Desktop: the grid decides the width.
        "lg:w-auto lg:transition-shadow lg:hover:shadow-md",
        className,
      )}
    >
      <div className="relative h-36 w-full overflow-hidden bg-secondary-container lg:h-40">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? title}
            fill
            sizes="(min-width: 1024px) 420px, 270px"
            className="object-cover lg:transition-transform lg:duration-300 lg:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-lowest/80 text-secondary">
              <Glyph className="h-9 w-9" aria-hidden="true" />
            </div>
          </div>
        )}

        <Badge
          tone={isFree ? "overlay" : "overlay-primary"}
          className="absolute left-2.5 top-2.5"
        >
          {formatPriceInr(priceInr)}
        </Badge>

        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-on-surface/60 px-2.5 py-1 text-label-sm text-on-primary backdrop-blur-sm">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {formatEventWhen(startsAt)} · {location}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
        <div className="space-y-1">
          <Link href={href} className="line-clamp-1 text-label-lg text-on-surface hover:text-primary">
            {title}
          </Link>
          <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
            <HostIcon className="h-[15px] w-[15px] shrink-0 text-tertiary" aria-hidden="true" />
            <span className="truncate">{host}</span>
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="inline-flex items-center gap-1 text-label-sm text-secondary">
            <Users className="h-4 w-4" aria-hidden="true" />
            {goingCount} going
          </span>
          <Link
            href={href}
            className={buttonVariants({
              size: "sm",
              variant: actionTone === "solid" ? "solid" : "soft",
            })}
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </Card>
  );
}
