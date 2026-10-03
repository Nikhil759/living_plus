import Link from "next/link";
import { AvailabilityPill } from "@/components/local-businesses/availability-pill";
import { BusinessPhoto } from "@/components/local-businesses/business-photo";
import { ownerLine, startingPriceLabel } from "@/lib/local-businesses/view";
import { cn } from "@/lib/utils";
import type { BusinessCard } from "@/lib/types/local-business";

/** Compact card for the Home horizontal feed. */
export function LocalBusinessFeedCard({ business }: { business: BusinessCard }) {
  const price = startingPriceLabel(business.startingPrice);
  return (
    <Link
      href={`/local-businesses/${business.id}`}
      className={cn(
        "group flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-card bg-card shadow-card lg:w-full lg:min-w-0",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <BusinessPhoto
        name={business.name}
        category={business.category}
        src={business.coverUrl}
        className="aspect-video w-full"
      />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="line-clamp-1 text-headline text-ink">{business.name}</p>
        <p className="text-caption text-ink-tertiary">{ownerLine(business)}</p>
        <p className="line-clamp-1 text-callout text-ink-secondary">{business.tagline}</p>
        {price ? <p className="text-callout font-semibold text-ink">{price}</p> : null}
        <AvailabilityPill availability={business.availability} className="mt-2 self-start" />
      </div>
    </Link>
  );
}
