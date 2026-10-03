import { cn } from "@/lib/utils";
import type { AmenityStatus } from "@/lib/types/home";

interface StatusStyle {
  /** Chip background. */
  chip: string;
  /** Name text colour. */
  name: string;
  /** Status dot. */
  dot: string;
  /** Detail text. */
  detail: string;
}

const STATUS_STYLES: Record<AmenityStatus, StatusStyle> = {
  free: {
    chip: "bg-surface-container-lowest",
    name: "text-on-surface",
    dot: "bg-secondary",
    detail: "text-secondary font-semibold",
  },
  open: {
    chip: "bg-surface-container-lowest",
    name: "text-on-surface",
    dot: "bg-secondary",
    detail: "text-secondary font-semibold",
  },
  quiet: {
    chip: "bg-secondary-container",
    name: "text-on-secondary-fixed",
    dot: "bg-secondary",
    detail: "text-on-secondary-fixed-variant font-semibold",
  },
  moderate: {
    chip: "bg-surface-container-lowest",
    name: "text-on-surface",
    dot: "bg-outline-variant",
    detail: "text-tertiary font-semibold",
  },
  booked: {
    chip: "bg-surface-container-lowest",
    name: "text-on-surface",
    dot: "bg-outline-variant",
    detail: "text-on-surface-variant",
  },
  closed: {
    chip: "bg-surface-container-lowest",
    name: "text-on-surface-variant",
    dot: "bg-outline-variant",
    detail: "text-on-surface-variant",
  },
};

export interface AmenityChipProps {
  name: string;
  emoji: string;
  status: AmenityStatus;
  /** Live status text, e.g. "Moderate · 6 active". */
  detail: string;
  className?: string;
}

export function AmenityChip({
  name,
  emoji,
  status,
  detail,
  className,
}: AmenityChipProps) {
  const s = STATUS_STYLES[status];
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-2 shadow-card",
        s.chip,
        className,
      )}
    >
      <span aria-hidden="true" className="text-sm">
        {emoji}
      </span>
      <span className={cn("text-label-md", s.name)}>{name}</span>
      <span aria-hidden="true" className={cn("h-1 w-1 rounded-full", s.dot)} />
      <span className={cn("text-label-sm", s.detail)}>{detail}</span>
    </li>
  );
}
