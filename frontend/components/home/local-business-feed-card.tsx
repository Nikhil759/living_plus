import Link from "next/link";
import { IconTile } from "@/components/ui/icon-tile";
import { businessCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import type { LocalBusiness } from "@/lib/types/local-business";

export interface LocalBusinessFeedCardProps {
  business: LocalBusiness;
}

/** Compact card for the Home horizontal feed. */
export function LocalBusinessFeedCard({ business }: LocalBusinessFeedCardProps) {
  const Icon = businessCategoryIcon(business.category);

  return (
    <Link
      href={`/local-businesses/${business.id}`}
      className={cn(
        "group flex w-[280px] shrink-0 snap-start flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:w-full lg:min-w-0",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <IconTile>
        <Icon />
      </IconTile>
      <p className="line-clamp-2 text-headline text-ink">{business.name}</p>
      <p className="line-clamp-2 text-callout text-ink-secondary">{business.tagline}</p>
      {business.distanceLabel ? (
        <p className="mt-auto text-caption text-ink-tertiary">{business.distanceLabel}</p>
      ) : null}
    </Link>
  );
}
