"use client";

import Image from "next/image";
import { useState } from "react";
import { categoryCoverSrc } from "@/lib/events/categories";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/lib/types/home";

interface EventCoverProps {
  title: string;
  imageUrl?: string;
  category?: EventCategory;
  sizes: string;
  className?: string;
  priority?: boolean;
}

export function EventCover({
  title,
  imageUrl,
  category = "other",
  sizes,
  className,
  priority,
}: EventCoverProps) {
  const fallback = categoryCoverSrc(category);
  const [failed, setFailed] = useState(false);
  const photo = imageUrl && !failed ? imageUrl : null;

  return (
    <div className={cn("relative aspect-[16/10] overflow-hidden bg-quiet", className)}>
      {/* Fallback is always painted so a broken cover never shows alt text. */}
      <img
        src={fallback}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      {photo ? (
        <Image
          src={photo}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY3Ii8+PC9zdmc+"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <span className="sr-only">{title}</span>
    </div>
  );
}
