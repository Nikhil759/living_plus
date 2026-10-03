"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAction } from "@/components/local-businesses/use-action";
import {
  postUpdateApi,
  setAvailabilityApi,
  setFeaturedApi,
} from "@/lib/api/local-businesses-client";
import { AVAILABILITY_LABEL } from "@/lib/local-businesses/view";
import { cn } from "@/lib/utils";
import type { BusinessAvailability, BusinessDetail } from "@/lib/types/local-business";

const MAX_UPDATE = 280;
const STATUSES = Object.keys(AVAILABILITY_LABEL) as BusinessAvailability[];

/** Edit, status, post an update, counts and Featured, for the owner. */
export function OwnerTools({ business }: { business: BusinessDetail }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const { busy, error, run } = useAction();
  const approved = business.reviewStatus === "approved";

  async function apply(action: () => Promise<BusinessDetail>, after?: () => void) {
    const detail = await run(action);
    if (!detail) return;
    after?.();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-tile bg-quiet p-3">
          <p className="text-title text-ink">{business.followerCount ?? 0}</p>
          <p className="text-caption text-ink-secondary">Followers</p>
        </div>
        <div className="rounded-tile bg-quiet p-3">
          <p className="text-title text-ink">{business.recommendationCount}</p>
          <p className="text-caption text-ink-secondary">Recommendations</p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-callout font-semibold text-ink">Status</legend>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={business.availability === status}
              disabled={busy}
              onClick={() => void apply(() => setAvailabilityApi(business.id, status))}
              className={cn(
                "rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium",
                business.availability === status ? "bg-primary text-white" : "bg-quiet text-ink-secondary",
              )}
            >
              {AVAILABILITY_LABEL[status]}
            </button>
          ))}
        </div>
      </fieldset>

      {approved ? (
        <div className="space-y-2">
          <label className="block text-callout font-semibold text-ink" htmlFor="business-update">
            Post an update
          </label>
          <textarea
            id="business-update"
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_UPDATE))}
            rows={3}
            maxLength={MAX_UPDATE}
            placeholder="Today's menu, new batch, free slots…"
            className="w-full resize-none rounded-tile bg-quiet px-4 py-3 text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-ink-tertiary">
              {text.length}/{MAX_UPDATE} · followers are notified
            </span>
            <Button
              size="sm"
              disabled={busy || text.trim() === ""}
              onClick={() => void apply(() => postUpdateApi(business.id, text.trim()), () => setText(""))}
            >
              Post
            </Button>
          </div>
        </div>
      ) : null}

      {approved ? (
        <label className="flex items-start gap-3 rounded-tile bg-quiet p-3.5">
          <input
            type="checkbox"
            checked={business.isFeatured}
            disabled={busy}
            onChange={(event) => void apply(() => setFeaturedApi(business.id, event.target.checked))}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block text-callout font-semibold text-ink">Featured</span>
            <span className="block text-caption text-ink-secondary">
              A Plus feature, unlocked in the demo. Shows first in Home. Up to 4 per society.
            </span>
          </span>
        </label>
      ) : null}

      <Link
        href={`/local-businesses/${business.id}/edit`}
        className={buttonVariants({ variant: "secondary", className: "w-full" })}
      >
        Edit
      </Link>
      {error ? (
        <p role="alert" className="text-center text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
