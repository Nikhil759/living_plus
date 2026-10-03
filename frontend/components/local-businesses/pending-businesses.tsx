"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BusinessPhoto } from "@/components/local-businesses/business-photo";
import { useAction } from "@/components/local-businesses/use-action";
import { Button } from "@/components/ui/button";
import { fetchPendingBusinessesApi, reviewBusinessApi } from "@/lib/api/local-businesses-client";
import { BUSINESS_CATEGORY_LABEL, ownerLine } from "@/lib/local-businesses/view";
import type { BusinessCard } from "@/lib/types/local-business";

function PendingRow({ business, onDone }: { business: BusinessCard; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, error, run, setError } = useAction();

  async function review(decision: "approve" | "reject") {
    if (decision === "reject" && reason.trim().length < 3) {
      setError("Give a short reason.");
      return;
    }
    if (await run(() => reviewBusinessApi(business.id, decision, reason.trim() || undefined))) onDone();
  }

  return (
    <li className="space-y-3 rounded-card bg-card p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <BusinessPhoto
          name={business.name}
          category={business.category}
          src={business.coverUrl}
          className="h-14 w-24 shrink-0 rounded-tile"
        />
        <div className="min-w-0 flex-1">
          <Link href={`/local-businesses/${business.id}`} className="line-clamp-1 text-headline text-ink">
            {business.name}
          </Link>
          <p className="line-clamp-1 text-caption text-ink-secondary">
            {BUSINESS_CATEGORY_LABEL[business.category]} · {ownerLine(business)}
          </p>
        </div>
        {rejecting ? null : (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={busy} onClick={() => void review("approve")}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRejecting(true)}>
              Reject
            </Button>
          </div>
        )}
      </div>
      {rejecting ? (
        <div className="space-y-2">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            aria-label="Reason for rejecting"
            placeholder="Reason, e.g. Please add a clearer cover photo"
            className="h-11 w-full rounded-tile bg-quiet px-4 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex gap-2">
            <Button size="sm" className="!bg-status-red" disabled={busy} onClick={() => void review("reject")}>
              Reject
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** Committee only: new listings waiting for their one-time approval. Renders nothing when empty. */
export function PendingBusinesses() {
  const [items, setItems] = useState<BusinessCard[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPendingBusinessesApi(controller.signal)
      .then(setItems)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Pending businesses failed to load", error);
      });
    return () => controller.abort();
  }, []);

  if (items.length === 0) return null;
  return (
    <section className="space-y-3" aria-label="Waiting for approval">
      <h2 className="text-headline text-ink">Waiting for approval</h2>
      <ul className="space-y-3">
        {items.map((business) => (
          <PendingRow
            key={business.id}
            business={business}
            onDone={() => setItems((current) => current.filter((item) => item.id !== business.id))}
          />
        ))}
      </ul>
    </section>
  );
}
