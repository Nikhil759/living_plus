import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { formatPriceInr } from "@/lib/format";
import {
  LISTING_CATEGORY_LABEL,
  LISTING_CONDITION_LABEL,
} from "@/lib/marketplace-labels";
import { cn } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types/marketplace";

export interface ListingCardProps {
  listing: MarketplaceListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const sold = listing.status === "sold";
  const reserved = listing.status === "reserved";

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className={cn(
        "group block overflow-hidden rounded-card bg-card shadow-card",
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
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-tertiary">
            <Package className="h-12 w-12" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        {sold || reserved ? (
          <span className="glass absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-caption font-semibold">
            {sold ? "Sold" : "Reserved"}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-5">
        <p className="line-clamp-2 text-headline text-ink">{listing.title}</p>
        <p className="text-title text-primary">{formatPriceInr(listing.priceInr)}</p>
        <p className="text-caption text-ink-secondary">
          {LISTING_CONDITION_LABEL[listing.condition]} · {LISTING_CATEGORY_LABEL[listing.category]}
        </p>
        <p className="text-caption text-ink-tertiary">{listing.sellerLabel}</p>
      </div>
    </Link>
  );
}
