"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/local-businesses/use-action";
import { removeNoteApi } from "@/lib/api/local-businesses-client";

/** Committee only: take a recommendation note down (the recommendation itself stays). */
export function RemoveNoteButton({
  businessId,
  recommendationId,
}: {
  businessId: string;
  recommendationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, error, run, setError } = useAction();

  async function remove() {
    if (reason.trim().length < 3) {
      setError("Give a short reason.");
      return;
    }
    if (await run(() => removeNoteApi(businessId, recommendationId, reason.trim()))) router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-caption font-semibold text-status-red"
      >
        Remove note
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={200}
        aria-label="Reason for removing this note"
        placeholder="Reason"
        className="h-10 w-full rounded-tile bg-quiet px-3 text-callout text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <div className="flex gap-2">
        <Button size="sm" className="!bg-status-red" disabled={busy} onClick={() => void remove()}>
          Remove
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
