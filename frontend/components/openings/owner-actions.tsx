"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/local-businesses/use-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { markFilledApi, removeOpeningApi, renewOpeningApi } from "@/lib/api/openings-client";
import { postedOn } from "@/lib/openings/view";
import type { OpeningState } from "@/lib/types/flat-opening";

interface OwnerActionsProps {
  openingId: string;
  state: OpeningState;
  canRenew: boolean;
  expiresAt: string | null;
}

/** "Still available" prompt: shown in the last 3 days and after the listing has lapsed. */
function RenewPrompt({ openingId, state, expiresAt }: Omit<OwnerActionsProps, "canRenew">) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const message =
    state === "expired"
      ? "This opening has ended and neighbours can't see it."
      : `This opening ends on ${expiresAt ? postedOn(expiresAt) : "soon"}.`;

  return (
    <div className="space-y-2.5 rounded-tile bg-primary-tint p-3.5">
      <p className="text-callout text-ink">{message} Is it still available?</p>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => void run(() => renewOpeningApi(openingId)).then((done) => done && router.refresh())}
      >
        Still available
      </Button>
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Edit, mark as filled and delete (after a confirmation) for the person who posted it. */
export function OwnerActions(props: OwnerActionsProps) {
  const { openingId, state, canRenew } = props;
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const fill = () => run(() => markFilledApi(openingId)).then((done) => done && router.refresh());
  const remove = () =>
    run(() => removeOpeningApi(openingId).then(() => true)).then((done) => {
      if (done) router.push("/flat-openings");
    });

  return (
    <div className="space-y-3">
      {canRenew ? <RenewPrompt {...props} /> : null}
      {state === "filled" ? (
        <p className="text-callout text-ink-secondary">Marked as filled. Neighbours no longer see it.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <Link href={`/flat-openings/${openingId}/edit`} className={buttonVariants({ variant: "secondary" })}>
            Edit
          </Link>
          <Button disabled={busy} onClick={() => void fill()}>
            Mark as filled
          </Button>
        </div>
      )}

      {confirming ? (
        <div className="space-y-2.5 rounded-tile bg-quiet p-3.5">
          <p className="text-callout font-semibold text-ink">Delete this opening?</p>
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
          className="block text-callout font-semibold text-status-red"
        >
          Delete
        </button>
      )}
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
