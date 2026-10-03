"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/local-businesses/use-action";
import { Button } from "@/components/ui/button";
import { removeOpeningApi } from "@/lib/api/openings-client";

const MIN_REASON = 3;

/** Committee only: take down someone else's opening, with a reason. */
export function CommitteeRemove({ openingId }: { openingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, error, run, setError } = useAction();

  async function remove() {
    if (reason.trim().length < MIN_REASON) {
      setError("Give a short reason for removing this opening.");
      return;
    }
    const done = await run(() => removeOpeningApi(openingId, reason.trim()).then(() => true));
    if (done) router.push("/flat-openings");
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
            placeholder="Reason, e.g. Not a genuine listing"
            className="h-11 w-full rounded-tile bg-card px-4 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex gap-2">
            <Button size="sm" className="!bg-status-red" disabled={busy} onClick={() => void remove()}>
              Remove opening
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Remove opening
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
