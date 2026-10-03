"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { reportListingApi } from "@/lib/api/marketplace-client";

const MIN_REASON = 3;

export function ReportListing({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < MIN_REASON) {
      setError("Tell us briefly what's wrong.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDone(await reportListingApi(listingId, reason.trim()));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="text-center text-callout text-ink-secondary">
        {done}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1.5 text-callout text-ink-secondary hover:text-ink"
      >
        <Flag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Report listing
      </button>
    );
  }

  return (
    <div className="space-y-2.5 rounded-tile bg-quiet p-3.5">
      <label className="block space-y-1.5">
        <span className="text-callout font-semibold text-ink">What's wrong with this listing?</span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          placeholder="e.g. Looks like a scam"
          className="h-11 w-full rounded-tile bg-card px-4 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </label>
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void submit()}>
          Send report
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
