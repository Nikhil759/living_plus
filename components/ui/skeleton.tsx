import * as React from "react";
import { cn } from "@/lib/utils";

/** Pulsing placeholder block. Size it with className (e.g. `h-4 w-32`). */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-lg bg-surface-container-high motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
