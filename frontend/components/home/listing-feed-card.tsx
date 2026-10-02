import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { formatPriceInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types/marketplace";

export interface ListingFeedCardProps {
  listing: MarketplaceListing;
}

/** Compact card for the Home horizontal feed. */
export function ListingFeedCard({ listing }: ListingFeedCardProps) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className={cn(
        "group w-[280px] shrink-0 snap-start overflow-hidden rounded-card bg-card shadow-card lg:w-full lg:min-w-0",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <div className="relative aspect-[4/3] bg-quiet">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.imageAlt ?? listing.title}
            fill
            className="object-cover"
            sizes="280px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-tertiary">
            <Package className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-4">
        <p className="line-clamp-2 text-headline text-ink">{listing.title}</p>
        <p className="text-callout font-semibold text-primary">{formatPriceInr(listing.priceInr)}</p>
      </div>
    </Link>
  );
}
