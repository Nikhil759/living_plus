"use client";

import { useRef, useState } from "react";
import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ListingCategory, ListingStatus } from "@/lib/types/marketplace";

interface ListingGalleryProps {
  title: string;
  category: ListingCategory;
  photos: string[];
  status: ListingStatus;
  className?: string;
}

/** Swipeable full-width photos on mobile; a main photo with thumbnails on desktop. */
export function ListingGallery({ title, category, photos, status, className }: ListingGalleryProps) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const slides: Array<string | null> = photos.length > 0 ? photos : [null];

  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar lg:hidden"
      >
        {slides.map((src, i) => (
          <ListingPhoto
            key={src ?? "none"}
            title={`${title}, photo ${i + 1} of ${slides.length}`}
            category={category}
            src={src}
            large
            className="aspect-square w-full shrink-0 snap-center"
          />
        ))}
      </div>
      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-1.5 rounded-full", i === index ? "bg-white" : "bg-white/50")}
            />
          ))}
        </div>
      ) : null}

      <div className="hidden space-y-3 lg:block">
        <ListingPhoto
          title={title}
          category={category}
          src={slides[index] ?? slides[0]}
          large
          className="aspect-square w-full rounded-card"
        />
        {slides.length > 1 ? (
          <ul className="flex gap-2.5" aria-label="Photos">
            {slides.map((src, i) => (
              <li key={src ?? "none"}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "block overflow-hidden rounded-tile ring-2 ring-offset-2 ring-offset-canvas transition-shadow",
                    i === index ? "ring-primary" : "ring-transparent hover:ring-hairline",
                  )}
                >
                  <ListingPhoto title="" category={category} src={src} className="h-16 w-16" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {status === "sold" ? (
        <Badge tone="overlay" className="absolute left-3 top-3 font-semibold">
          Sold
        </Badge>
      ) : null}
    </div>
  );
}
