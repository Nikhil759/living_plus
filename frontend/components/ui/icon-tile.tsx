import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconTileProps {
  children: React.ReactNode;
  className?: string;
  /** Soft primary tint (default) or quiet fill. */
  tone?: "primary" | "quiet";
}

export function IconTile({ children, className, tone = "primary" }: IconTileProps) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-tile [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[1.5]",
        tone === "primary" ? "bg-primary-tint text-primary" : "bg-quiet text-ink-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}
