"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { LISTING_CATEGORY_ICON } from "@/lib/marketplace/icons";
import { resolveListingPhoto } from "@/lib/marketplace/photo";
import { cn } from "@/lib/utils";
import type { ListingCategory } from "@/lib/types/marketplace";

interface ListingPhotoProps {
  title: string;
  /** Pick the icon from a marketplace category, or pass one directly. */
  category?: ListingCategory;
  icon?: IconDefinition;
  src?: string | null;
  className?: string;
  /** Larger icon for the item page's main photo. */
  large?: boolean;
}

/** A tinted tile with the category icon is always painted, so a missing photo never shows alt text. */
export function ListingPhoto({ title, category, icon, src, className, large }: ListingPhotoProps) {
  const resolved = resolveListingPhoto(src);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  useEffect(() => {
    // The browser may report the error before React attaches onError.
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [resolved]);

  return (
    <div className={cn("relative overflow-hidden bg-primary-tint", className)}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <FontAwesomeIcon
          icon={icon ?? (category ? LISTING_CATEGORY_ICON[category] : faImage)}
          className={cn("text-primary/40", large ? "h-16 w-16" : "h-9 w-9")}
        />
      </div>
      {resolved && !failed ? (
        <img
          ref={ref}
          src={resolved}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <span className="sr-only">{title}</span>
    </div>
  );
}
