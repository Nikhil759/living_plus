"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { setClosureApi } from "@/lib/api/amenities-client";

/** Committee only: close an amenity for maintenance, or reopen it. */
export function ClosureControl({ amenityId, closed }: { amenityId: string; closed: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await setClosureApi(amenityId, !closed, closed ? undefined : note);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-card bg-quiet p-4">
      <p className="text-callout font-semibold text-ink">Committee</p>
      {closed ? null : (
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder="Reason, e.g. Closed for maintenance"
          aria-label="Closure reason"
          className="h-11 w-full rounded-tile bg-card px-4 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      )}
      <Button variant={closed ? "primary" : "secondary"} size="sm" disabled={busy} onClick={() => void submit()}>
        {closed ? "Reopen" : "Close for maintenance"}
      </Button>
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </section>
  );
}
