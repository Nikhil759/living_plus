import Link from "next/link";
import { AvailabilityPill } from "@/components/local-businesses/availability-pill";
import { BusinessPhoto } from "@/components/local-businesses/business-photo";
import { Badge } from "@/components/ui/badge";
import { ownerLine, recommendedLabel, startingPriceLabel } from "@/lib/local-businesses/view";
import { cn } from "@/lib/utils";
import type { BusinessCard as BusinessCardData } from "@/lib/types/local-business";

const CARD = "group flex h-full flex-col overflow-hidden rounded-card bg-card shadow-card";

/** `preview` renders the same card without a link, for the listing form. */
export function BusinessCard({
  business,
  preview = false,
}: {
  business: BusinessCardData;
  preview?: boolean;
}) {
  const price = startingPriceLabel(business.startingPrice);
  const body = (
    <>
      <BusinessPhoto
        name={business.name}
        category={business.category}
        src={business.coverUrl}
        className="aspect-video w-full"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-headline text-ink">{business.name}</p>
          {business.reviewStatus === "pending" ? <Badge dot="amber">Pending</Badge> : null}
          {business.reviewStatus === "rejected" ? <Badge dot="red">Needs changes</Badge> : null}
        </div>
        <p className="text-caption text-ink-tertiary">{ownerLine(business)}</p>
        <p className="line-clamp-1 text-callout text-ink-secondary">{business.tagline}</p>
        {price ? <p className="text-callout font-semibold text-ink">{price}</p> : null}
        <p className="text-caption text-ink-tertiary">{recommendedLabel(business.recommendationCount)}</p>
        <AvailabilityPill availability={business.availability} className="mt-auto self-start" />
      </div>
    </>
  );

  return preview ? (
    <div className={CARD}>{body}</div>
  ) : (
    <Link
      href={`/local-businesses/${business.id}`}
      className={cn(
        CARD,
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      {body}
    </Link>
  );
}

export function BusinessCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-card shadow-card" aria-hidden="true">
      <div className="shimmer aspect-video w-full" />
      <div className="space-y-2.5 p-4">
        <div className="shimmer h-5 w-3/4 rounded-tile" />
        <div className="shimmer h-3 w-1/3 rounded-tile" />
        <div className="shimmer h-4 w-full rounded-tile" />
        <div className="shimmer h-4 w-1/3 rounded-tile" />
        <div className="shimmer h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}
