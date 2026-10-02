import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";

type Tone = "neutral" | "primary" | "secondary" | "overlay" | "overlay-primary";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Optional 8px status marker — the only place colour fills are allowed. */
  dot?: StatusTone;
}

export function Badge({ tone = "neutral", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-quiet px-2.5 py-0.5 text-caption text-ink-secondary",
        tone === "overlay" || tone === "overlay-primary"
          ? "glass text-ink"
          : null,
        className,
      )}
      {...props}
    >
      {dot ? <StatusDot tone={dot} /> : null}
      {children}
    </span>
  );
}
