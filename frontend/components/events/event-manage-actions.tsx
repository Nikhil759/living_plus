"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  approveEventApi,
  cancelEventApi,
  duplicateEventApi,
  rejectEventApi,
} from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

const STUBS = ["Attendees and check-in", "Message attendees"] as const;

const inputClassName =
  "w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2";

function isClosed(status: HomeEvent["status"]): boolean {
  return status === "cancelled" || status === "completed";
}

export function EventManageActions({
  event,
  backend,
  layout = "wrap",
}: {
  event: HomeEvent;
  backend: "demo" | "api";
  layout?: "wrap" | "stack";
}) {
  const router = useRouter();
  const stack = layout === "stack";
  const isHost = Boolean(event.isHost);
  const isCommittee = Boolean(event.isCommittee);
  const closed = isClosed(event.status);
  const canEdit = (isHost || isCommittee) && !closed;
  const canCancel = (isHost || isCommittee) && !closed && backend === "api";
  const canDuplicate = (isHost || isCommittee) && backend === "api";
  const canReview = isCommittee && event.status === "pending_approval" && backend === "api";
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [pending, setPending] = useState<"cancel" | "duplicate" | "approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buttonClass = buttonVariants({
    variant: "secondary",
    size: "sm",
    className: stack ? "w-full" : undefined,
  });

  async function cancel() {
    const cleaned = reason.trim();
    if (cleaned.length < 3) {
      setError("Give a short reason for cancelling.");
      return;
    }
    setPending("cancel");
    setError(null);
    try {
      await cancelEventApi(event.id, cleaned);
      setCancelOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this event.");
    } finally {
      setPending(null);
    }
  }

  async function approve() {
    setPending("approve");
    setError(null);
    try {
      await approveEventApi(event.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this event.");
    } finally {
      setPending(null);
    }
  }

  async function reject() {
    const cleaned = rejectReason.trim();
    if (cleaned.length < 3) {
      setError("Give a short reason for rejecting.");
      return;
    }
    setPending("reject");
    setError(null);
    try {
      await rejectEventApi(event.id, cleaned);
      setRejectOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject this event.");
    } finally {
      setPending(null);
    }
  }

  async function duplicate() {
    setPending("duplicate");
    setError(null);
    try {
      const copy = await duplicateEventApi(event.id);
      router.push(`/events/${copy.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not duplicate this event.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-ink-secondary">Manage event</p>
      {canReview ? (
        <div className="space-y-2 rounded-tile bg-primary-tint p-3">
          <p className="text-caption font-medium text-primary">This event is waiting for approval.</p>
          <div className={cn("flex gap-2", stack ? "flex-col" : "flex-wrap")}>
            <button
              type="button"
              className={buttonVariants({ variant: "primary", size: "sm", className: stack ? "w-full" : undefined })}
              disabled={pending !== null}
              onClick={() => void approve()}
            >
              {pending === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={pending !== null}
              onClick={() => {
                setRejectOpen((open) => !open);
                setError(null);
              }}
            >
              Reject
            </button>
          </div>
          {rejectOpen ? (
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-ink-secondary">Why are you rejecting?</span>
              <textarea
                className={inputClassName}
                rows={3}
                maxLength={200}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="The host will see this reason"
              />
              <button
                type="button"
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: cn(stack ? "w-full" : undefined, "text-error"),
                })}
                disabled={pending !== null}
                onClick={() => void reject()}
              >
                {pending === "reject" ? "Rejecting…" : "Reject event"}
              </button>
            </label>
          ) : null}
        </div>
      ) : null}
      <div className={cn("flex gap-2", stack ? "flex-col" : "flex-wrap")}>
        {canEdit ? (
          <Link href={`/events/${event.id}/edit`} className={buttonClass}>
            Edit
          </Link>
        ) : (
          <button type="button" className={buttonClass} disabled title={closed ? "This event is closed" : "Coming in a later phase"}>
            Edit
          </button>
        )}
        {canCancel ? (
          <button
            type="button"
            className={buttonClass}
            disabled={pending !== null}
            onClick={() => {
              setCancelOpen((open) => !open);
              setError(null);
            }}
          >
            Cancel event
          </button>
        ) : (
          <button type="button" className={buttonClass} disabled title="Coming in a later phase">
            Cancel event
          </button>
        )}
        {STUBS.map((label) => (
          <button
            key={label}
            type="button"
            className={buttonClass}
            disabled
            title="Coming in a later phase"
          >
            {label}
          </button>
        ))}
        {canDuplicate ? (
          <button
            type="button"
            className={buttonClass}
            disabled={pending !== null}
            onClick={() => void duplicate()}
          >
            {pending === "duplicate" ? "Duplicating…" : "Duplicate"}
          </button>
        ) : (
          <button type="button" className={buttonClass} disabled title="Coming in a later phase">
            Duplicate
          </button>
        )}
      </div>
      {cancelOpen ? (
        <div className="space-y-2 rounded-tile bg-quiet p-3">
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">Why are you cancelling?</span>
            <textarea
              className={inputClassName}
              rows={3}
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Neighbours will see this reason"
            />
          </label>
          <div className={cn("flex gap-2", stack ? "flex-col" : "flex-wrap")}>
            <button
              type="button"
              className={buttonClass}
              disabled={pending !== null}
              onClick={() => {
                setCancelOpen(false);
                setError(null);
              }}
            >
              Keep event
            </button>
            <button
              type="button"
              className={buttonVariants({
                variant: "secondary",
                size: "sm",
                className: cn(stack ? "w-full" : undefined, "text-error"),
              })}
              disabled={pending !== null}
              onClick={() => void cancel()}
            >
              {pending === "cancel" ? "Cancelling…" : "Cancel event"}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}
