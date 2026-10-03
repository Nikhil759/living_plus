import Link from "next/link";
import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { PriceTag } from "@/components/marketplace/price-tag";
import { Badge } from "@/components/ui/badge";
import { cardMeta, LISTING_CONDITION_LABEL } from "@/lib/marketplace/view";
import { cn } from "@/lib/utils";
import type { MarketplaceCard } from "@/lib/types/marketplace";

export function ListingCard({ listing }: { listing: MarketplaceCard }) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-card bg-card shadow-card",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <div className="relative">
        <ListingPhoto
          title={listing.title}
          category={listing.category}
          src={listing.coverUrl}
          className="aspect-square w-full"
        />
        {listing.status === "reserved" ? (
          <Badge tone="overlay" className="absolute left-2.5 top-2.5 font-semibold">
            Reserved
          </Badge>
        ) : null}
        {listing.reported ? (
          <Badge tone="overlay" dot="red" className="absolute right-2.5 top-2.5 font-semibold">
            Reported
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <PriceTag priceInr={listing.priceInr} isFree={listing.isFree} className="self-start" />
        <p className="line-clamp-2 min-h-[2.6em] text-callout text-ink">{listing.title}</p>
        <Badge className="self-start">{LISTING_CONDITION_LABEL[listing.condition]}</Badge>
        <p className="mt-auto pt-0.5 text-caption text-ink-tertiary">{cardMeta(listing)}</p>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-card shadow-card" aria-hidden="true">
      <div className="shimmer aspect-square w-full" />
      <div className="space-y-2.5 p-3.5">
        <div className="shimmer h-5 w-16 rounded-tile" />
        <div className="shimmer h-4 w-full rounded-tile" />
        <div className="shimmer h-4 w-2/3 rounded-tile" />
        <div className="shimmer h-3 w-1/2 rounded-tile" />
      </div>
    </div>
  );
}
