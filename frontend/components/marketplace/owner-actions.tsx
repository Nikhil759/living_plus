"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { removeListingApi, setListingStatusApi } from "@/lib/api/marketplace-client";
import type { ListingStatus } from "@/lib/types/marketplace";

interface OwnerActionsProps {
  listingId: string;
  status: ListingStatus;
}

/** Edit, status and delete controls for the seller. */
export function OwnerActions({ listingId, status }: OwnerActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(action: () => Promise<unknown>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (next: ListingStatus) =>
    run(() => setListingStatusApi(listingId, next), () => router.refresh());

  const remove = () =>
    run(() => removeListingApi(listingId), () => router.push("/marketplace"));

  return (
    <div className="space-y-2.5">
      {status === "sold" ? (
        <Button className="w-full" disabled={busy} onClick={() => void changeStatus("available")}>
          Relist
        </Button>
      ) : (
        <>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => void changeStatus(status === "reserved" ? "available" : "reserved")}
          >
            {status === "reserved" ? "Mark as available" : "Mark as reserved"}
          </Button>
          <Button className="w-full" disabled={busy} onClick={() => void changeStatus("sold")}>
            Mark as sold
          </Button>
        </>
      )}
      <Link
        href={`/marketplace/${listingId}/edit`}
        className={buttonVariants({ variant: "secondary", className: "w-full" })}
      >
        Edit
      </Link>

      {confirming ? (
        <div className="space-y-2.5 rounded-tile bg-quiet p-3.5">
          <p className="text-callout font-semibold text-ink">Delete this listing?</p>
          <p className="text-caption text-ink-secondary">Neighbours will no longer see it.</p>
          <div className="flex gap-2">
            <Button size="sm" className="!bg-status-red" disabled={busy} onClick={() => void remove()}>
              Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mx-auto block text-callout font-semibold text-status-red"
        >
          Delete
        </button>
      )}
      {error ? (
        <p role="alert" className="text-center text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
