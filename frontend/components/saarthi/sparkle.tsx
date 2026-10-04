"use client";

import { useCallback, useState } from "react";
import { stillFilled } from "@/lib/saarthi/fill-mapping";
import { cn } from "@/lib/utils";

/** The small mark next to a field label that Saarthi filled. */
export function Sparkle({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label="Filled by Saarthi"
      className={cn("ml-1 inline-block h-3.5 w-3.5 align-[-2px] text-primary", className)}
    >
      <title>Filled by Saarthi</title>
      <path
        fill="currentColor"
        d="M8 0.5l1.6 4.6 4.9 1.4-4.9 1.4L8 12.5 6.4 7.9 1.5 6.5l4.9-1.4zM13 10.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"
      />
    </svg>
  );
}

/**
 * Remembers what Saarthi filled. `shows(field, current)` stays true only while the field still
 * holds that value, so the sparkle goes away as soon as the resident edits the field.
 */
export function useFilledFields() {
  const [filled, setFilled] = useState<Record<string, unknown>>({});
  const mark = useCallback((values: object) => {
    setFilled((current) => ({ ...current, ...values }));
  }, []);
  const shows = useCallback(
    (field: string, current: unknown) => stillFilled(filled, field, current),
    [filled],
  );
  return { mark, shows };
}
