import Link from "next/link";
import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { FLAT_OPENING_KIND_LABEL, formatRentInr } from "@/lib/flat-opening-labels";
import { cn } from "@/lib/utils";
import type { FlatOpening } from "@/lib/types/flat-opening";

export interface OpeningFeedCardProps {
  opening: FlatOpening;
}

export function OpeningFeedCard({ opening }: OpeningFeedCardProps) {
  return (
    <Link
      href={`/flat-openings/${opening.id}`}
      className={cn(
        "group flex w-[280px] shrink-0 snap-start flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:w-full lg:min-w-0",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <div className="flex items-center gap-2">
        <IconTile>
          <Home />
        </IconTile>
        <Badge>{FLAT_OPENING_KIND_LABEL[opening.kind]}</Badge>
      </div>
      <p className="line-clamp-2 text-headline text-ink">{opening.title}</p>
      <p className="text-callout font-semibold text-primary">{formatRentInr(opening.rentInr)}</p>
      <p className="mt-auto text-caption text-ink-tertiary">
        {opening.tower} · {opening.bhk}
      </p>
    </Link>
  );
}
