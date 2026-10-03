import Link from "next/link";
import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { PriceTag } from "@/components/marketplace/price-tag";
import { cn } from "@/lib/utils";
import type { MarketplaceCard } from "@/lib/types/marketplace";

export interface ListingFeedCardProps {
  listing: MarketplaceCard;
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
      <ListingPhoto
        title={listing.title}
        category={listing.category}
        src={listing.coverUrl}
        className="aspect-[4/3] w-full"
      />
      <div className="space-y-0.5 p-4">
        <p className="line-clamp-2 text-headline text-ink">{listing.title}</p>
        <PriceTag priceInr={listing.priceInr} isFree={listing.isFree} className="!text-callout !text-primary" />
      </div>
    </Link>
  );
}
