import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "secondary" | "overlay" | "overlay-primary";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-primary-fixed text-on-primary-fixed-variant",
  secondary: "bg-secondary-container text-on-secondary-fixed-variant",
  // Sits on top of photos: translucent white + blur.
  overlay: "bg-surface-container-lowest/90 text-secondary font-semibold backdrop-blur-md",
  "overlay-primary": "bg-surface-container-lowest/90 text-primary font-semibold backdrop-blur-md",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
