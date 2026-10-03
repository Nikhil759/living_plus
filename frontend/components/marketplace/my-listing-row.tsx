"use client";

import Link from "next/link";
import { useState } from "react";
import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { PriceTag } from "@/components/marketplace/price-tag";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { removeListingApi, setListingStatusApi } from "@/lib/api/marketplace-client";
import { listedAgo } from "@/lib/marketplace/view";
import type { ListingStatus, MarketplaceCard } from "@/lib/types/marketplace";

const STATUS_LABEL: Record<ListingStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};
const STATUS_DOT = { available: "green", reserved: "amber", sold: "quiet" } as const;

interface MyListingRowProps {
  listing: MarketplaceCard;
  /** Called after any change so the list can reload. */
  onChanged: () => void;
}

export function MyListingRow({ listing, onChanged }: MyListingRowProps) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const changeStatus = (status: ListingStatus) => void run(() => setListingStatusApi(listing.id, status));

  return (
    <li className="rounded-card bg-card p-3.5 shadow-card sm:p-4">
      <div className="flex gap-3.5">
        <Link href={`/marketplace/${listing.id}`} className="shrink-0">
          <ListingPhoto
            title={listing.title}
            category={listing.category}
            src={listing.coverUrl}
            className="h-[72px] w-[72px] rounded-tile sm:h-20 sm:w-20"
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <Link href={`/marketplace/${listing.id}`} className="line-clamp-2 text-headline text-ink">
            {listing.title}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <PriceTag priceInr={listing.priceInr} isFree={listing.isFree} className="!text-callout" />
            <Badge dot={STATUS_DOT[listing.status]}>{STATUS_LABEL[listing.status]}</Badge>
            <span className="text-caption text-ink-tertiary">Listed {listedAgo(listing.listedAt)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {listing.status === "sold" ? (
          <Button size="sm" disabled={busy} onClick={() => changeStatus("available")}>
            Relist
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => changeStatus(listing.status === "reserved" ? "available" : "reserved")}
            >
              {listing.status === "reserved" ? "Mark available" : "Mark reserved"}
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => changeStatus("sold")}>
              Mark sold
            </Button>
          </>
        )}
        <Link href={`/marketplace/${listing.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Edit
        </Link>
        {confirming ? (
          <span className="ml-auto flex items-center gap-2">
            <span className="text-callout text-ink-secondary">Delete this listing?</span>
            <Button
              size="sm"
              className="!bg-status-red"
              disabled={busy}
              onClick={() => void run(() => removeListingApi(listing.id))}
            >
              Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="ml-auto text-callout font-semibold text-status-red"
          >
            Delete
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </li>
  );
}
