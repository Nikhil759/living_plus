import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale lives in tailwind.config.ts as `text-label-sm`, `text-body-md`, …
 * Without registering them, tailwind-merge treats them as text *colours* and
 * silently drops e.g. `text-on-primary` when both are present.
 */
const FONT_SIZE_TOKENS = [
  "large-title",
  "title",
  "headline",
  "body",
  "callout",
  "caption",
  "label-sm",
  "label-md",
  "label-lg",
  "body-sm",
  "body-md",
  "body-lg",
  "headline-sm",
  "headline-md",
  "headline-lg",
  "headline-xl-mobile",
  "headline-xl",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE_TOKENS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
