import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatRent, KIND_LABEL } from "@/lib/openings/view";
import { cn } from "@/lib/utils";
import type { FlatOpeningCard } from "@/lib/types/flat-opening";

export interface OpeningFeedCardProps {
  opening: FlatOpeningCard;
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
      <Badge className="self-start">{KIND_LABEL[opening.kind]}</Badge>
      <p className="line-clamp-2 text-headline text-ink">{opening.title}</p>
      <p className="mt-auto text-callout font-semibold text-primary">{formatRent(opening.rentInr)}</p>
    </Link>
  );
}
