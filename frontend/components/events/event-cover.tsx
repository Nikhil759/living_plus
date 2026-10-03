"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { categoryCoverSrc } from "@/lib/events/categories";
import {
  EVENT_CARD_COVER_WIDTH,
  EVENT_HERO_COVER_WIDTH,
  isUnsplashCover,
  resolveEventCoverSrc,
  sizedEventCoverUrl,
} from "@/lib/events/cover";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/lib/types/home";

interface EventCoverProps {
  title: string;
  imageUrl?: string;
  category?: EventCategory;
  sizes: string;
  className?: string;
  priority?: boolean;
  frame?: "card" | "hero";
}

const FRAME: Record<NonNullable<EventCoverProps["frame"]>, string> = {
  card: "aspect-[16/10]",
  hero: "aspect-[16/10] md:aspect-auto md:h-[360px]",
};

export function EventCover({
  title,
  imageUrl,
  category = "other",
  sizes,
  className,
  priority,
  frame = "card",
}: EventCoverProps) {
  const fallback = categoryCoverSrc(category);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);
  const minWidth = frame === "hero" ? EVENT_HERO_COVER_WIDTH : EVENT_CARD_COVER_WIDTH;
  const resolved = resolveEventCoverSrc(imageUrl);
  const photo = !failed ? sizedEventCoverUrl(resolved, minWidth) : null;
  const optimize = Boolean(photo && isUnsplashCover(photo));

  return (
    <div className={cn("relative overflow-hidden bg-quiet", FRAME[frame], className)}>
      {/* Fallback is always painted so a broken cover never shows alt text. */}
      <img
        src={fallback}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      {photo && optimize ? (
        <Image
          src={photo}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          quality={frame === "hero" ? 90 : 80}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY3Ii8+PC9zdmc+"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      {photo && !optimize ? (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <span className="sr-only">{title}</span>
    </div>
  );
}
