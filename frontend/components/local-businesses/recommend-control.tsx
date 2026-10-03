"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/local-businesses/use-action";
import {
  recommendBusinessApi,
  withdrawRecommendationApi,
} from "@/lib/api/local-businesses-client";
import type { BusinessViewer } from "@/lib/types/local-business";

const MAX_NOTE = 140;

/** One recommendation per resident, with an optional short note. Can be withdrawn. */
export function RecommendControl({
  businessId,
  initialViewer,
}: {
  businessId: string;
  initialViewer: BusinessViewer;
}) {
  const router = useRouter();
  const [recommended, setRecommended] = useState(initialViewer.recommended);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { busy, error, run } = useAction();

  async function submit() {
    const detail = await run(() => recommendBusinessApi(businessId, note));
    if (!detail) return;
    setRecommended(detail.viewer.recommended);
    setOpen(false);
    setNote("");
    router.refresh();
  }

  async function withdraw() {
    const detail = await run(() => withdrawRecommendationApi(businessId));
    if (!detail) return;
    setRecommended(detail.viewer.recommended);
    router.refresh();
  }

  // A fragment: the parent grid puts the button beside Follow and the note form on its own row.
  return (
    <>
      <div className="min-w-0">
        {recommended ? (
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => void withdraw()}
          >
            <ThumbsUp
              className="h-4 w-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Withdraw
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <ThumbsUp
              className="h-4 w-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Recommend
          </Button>
        )}
        {recommended ? (
          <p className="mt-1 text-center text-caption text-ink-tertiary">
            You recommended this
          </p>
        ) : null}
      </div>
      {open && !recommended ? (
        <div className="col-span-2 space-y-2">
          <label className="block">
            <span className="sr-only">Add a note (optional)</span>
            <textarea
              value={note}
              onChange={(event) =>
                setNote(event.target.value.slice(0, MAX_NOTE))
              }
              rows={3}
              maxLength={MAX_NOTE}
              placeholder="Add a note (optional)"
              className="w-full resize-none rounded-tile bg-quiet px-4 py-3 text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-ink-tertiary">
              {note.length}/{MAX_NOTE}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={busy} onClick={() => void submit()}>
                Recommend
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="col-span-2 text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </>
  );
}
