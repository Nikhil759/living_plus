"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { removeListingApi } from "@/lib/api/marketplace-client";

const MIN_REASON = 3;

/** Committee only: take down someone else's listing, with a reason. */
export function CommitteeRemove({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (reason.trim().length < MIN_REASON) {
      setError("Give a short reason for removing this listing.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await removeListingApi(listingId, reason.trim());
      router.push("/marketplace");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove the listing. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-card bg-quiet p-4">
      <p className="text-callout font-semibold text-ink">Committee</p>
      {open ? (
        <>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            aria-label="Reason for removal"
            placeholder="Reason, e.g. Prohibited item"
            className="h-11 w-full rounded-tile bg-card px-4 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex gap-2">
            <Button size="sm" className="!bg-status-red" disabled={busy} onClick={() => void remove()}>
              Remove listing
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Remove listing
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </section>
  );
}
