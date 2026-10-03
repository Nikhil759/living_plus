"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/local-businesses/use-action";
import { removeBusinessApi, reviewBusinessApi } from "@/lib/api/local-businesses-client";

type Mode = "reject" | "remove" | null;

const REASON_INPUT =
  "h-11 w-full rounded-tile bg-card px-4 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/** Committee only: approve or reject a new listing, or take a business down, with a reason. */
export function CommitteeTools({
  businessId,
  canReview,
  canRemove,
}: {
  businessId: string;
  canReview: boolean;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const { busy, error, run, setError } = useAction();

  function open(next: Mode) {
    setMode(next);
    setReason("");
    setError(null);
  }

  async function approve() {
    if (await run(() => reviewBusinessApi(businessId, "approve"))) router.refresh();
  }

  async function confirm() {
    if (reason.trim().length < 3) {
      setError("Give a short reason.");
      return;
    }
    if (mode === "reject") {
      if (await run(() => reviewBusinessApi(businessId, "reject", reason.trim()))) {
        setMode(null);
        router.refresh();
      }
    } else if ((await run(async () => (await removeBusinessApi(businessId, reason.trim()), true))) === true) {
      router.push("/local-businesses");
    }
  }

  return (
    <section className="space-y-3 rounded-card bg-quiet p-4">
      <p className="text-callout font-semibold text-ink">Committee</p>
      {mode ? (
        <>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            aria-label={mode === "reject" ? "Reason for rejecting" : "Reason for removal"}
            placeholder={mode === "reject" ? "Reason, e.g. Please add a clearer cover photo" : "Reason, e.g. Not a resident business"}
            className={REASON_INPUT}
          />
          <div className="flex gap-2">
            <Button size="sm" className="!bg-status-red" disabled={busy} onClick={() => void confirm()}>
              {mode === "reject" ? "Reject" : "Remove business"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => open(null)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canReview ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => void approve()}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => open("reject")}>
                Reject
              </Button>
            </>
          ) : null}
          {canRemove ? (
            <Button size="sm" variant="secondary" onClick={() => open("remove")}>
              Remove business
            </Button>
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </section>
  );
}
