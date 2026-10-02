import Image from "next/image";
import Link from "next/link";
import { Bike, CalendarDays, Flower2, Gamepad2, Music, type LucideIcon } from "lucide-react";
import { AvatarStack } from "@/components/home/avatar-stack";
import { formatEventWhen, formatPriceInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventGlyph, HomeEvent } from "@/lib/types/home";

const GLYPHS: Record<EventGlyph, LucideIcon> = {
  ride: Bike,
  game: Gamepad2,
  music: Music,
  wellness: Flower2,
  general: CalendarDays,
};

export function EventCard({
  title,
  startsAt,
  priceInr,
  imageUrl,
  imageAlt,
  glyph,
  goingCount,
  going,
  href,
  layout = "rail",
  className,
}: Omit<HomeEvent, "id"> & { className?: string; layout?: "rail" | "fill" }) {
  const Glyph = GLYPHS[glyph];

  return (
    <Link
      href={href}
      className={cn(
        "group overflow-hidden rounded-card bg-card shadow-card",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
        layout === "rail" &&
          "w-[280px] shrink-0 snap-start lg:w-[320px]",
        layout === "fill" && "min-w-0 w-full",
        className,
      )}
    >
      <div className="relative aspect-[16/10] bg-quiet">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? title}
            fill
            sizes={layout === "fill" ? "(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw" : "320px"}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY3Ii8+PC9zdmc+"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-tertiary">
            <Glyph className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        <span className="glass absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-caption font-semibold text-ink">
          {formatPriceInr(priceInr)}
        </span>
      </div>
      <div className="space-y-2 p-5">
        <h3 className="text-headline text-ink">{title}</h3>
        <p className="text-caption text-ink-tertiary">{formatEventWhen(startsAt)}</p>
        <div className="flex items-center gap-2">
          {going && going.length > 0 ? <AvatarStack people={going} total={goingCount} size="xs" /> : null}
          <p className="text-caption text-ink-secondary">{goingCount} neighbours going</p>
        </div>
      </div>
    </Link>
  );
}
