import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import {
  FLAT_OPENING_KIND_LABEL,
  FURNISHING_LABEL,
  formatRentInr,
} from "@/lib/flat-opening-labels";
import type { FlatOpening } from "@/lib/types/flat-opening";

export interface OpeningCardProps {
  opening: FlatOpening;
}

export function OpeningCard({ opening }: OpeningCardProps) {
  const filled = opening.status === "filled";

  return (
    <Link
      href={`/flat-openings/${opening.id}`}
      className="flex items-start gap-3 rounded-card bg-card p-5 shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
    >
      <IconTile>
        <Home />
      </IconTile>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="line-clamp-2 text-headline text-ink">{opening.title}</p>
          {filled ? <Badge>Filled</Badge> : null}
        </div>
        <p className="text-callout text-ink-secondary">
          {opening.tower}
          {opening.flatNo ? ` · ${opening.flatNo}` : ""} · {opening.bhk}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{FLAT_OPENING_KIND_LABEL[opening.kind]}</Badge>
          <span className="text-callout font-semibold text-primary">{formatRentInr(opening.rentInr)}</span>
          <span className="text-caption text-ink-tertiary">{FURNISHING_LABEL[opening.furnishing]}</span>
        </div>
        <p className="line-clamp-2 text-body text-ink-secondary">{opening.description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
}
