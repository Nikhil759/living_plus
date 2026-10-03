"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AmenityImageProps {
  name: string;
  src?: string | null;
  className?: string;
}

/** The neutral placeholder is always painted, so a missing photo never shows alt text. */
export function AmenityImage({ name, src, className }: AmenityImageProps) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    // The browser may report the error before React attaches onError.
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-quiet", className)}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <ImageIcon className="h-8 w-8 text-ink-tertiary/40" strokeWidth={1.5} />
      </div>
      {src && !failed ? (
        <img
          ref={ref}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <span className="sr-only">{name}</span>
    </div>
  );
}
