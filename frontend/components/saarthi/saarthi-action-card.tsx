"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";
import type { ActionStatus, SaarthiAction } from "@/lib/types/saarthi";
import { cn } from "@/lib/utils";

const STATUS: Record<ActionStatus, { label: string; tone: string }> = {
  proposed: { label: "Waiting for you", tone: "text-ink-secondary" },
  executed: { label: "Done", tone: "text-status-green" },
  pending_approval: { label: "Sent for approval", tone: "text-primary" },
  cancelled: { label: "Cancelled", tone: "text-ink-tertiary" },
  failed: { label: "Couldn't be done", tone: "text-status-red" },
  expired: { label: "Expired: ask again", tone: "text-ink-tertiary" },
};

const button =
  "inline-flex h-9 items-center rounded-full px-4 text-callout font-semibold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40";

/** Saarthi's proposed change. Nothing happens until the resident taps Confirm. */
export function SaarthiActionCard({ action }: { action: SaarthiAction }) {
  const { decide } = useSaarthi();
  const [busy, setBusy] = useState(false);
  const open = action.status === "proposed";

  async function choose(choice: "confirm" | "cancel") {
    setBusy(true);
    try {
      await decide(action.id, choice);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label={`Confirm: ${action.title}`}
      className="mt-2 rounded-tile border border-primary/30 bg-card p-3"
    >
      <p className="text-callout font-semibold text-ink">{action.title}</p>
      <dl className="mt-2 space-y-1">
        {action.lines.map((line) => (
          <div key={line.label} className="flex gap-2 text-caption">
            <dt className="w-24 shrink-0 text-ink-tertiary">{line.label}</dt>
            <dd className="min-w-0 flex-1 text-ink">{line.value}</dd>
          </div>
        ))}
      </dl>
      {action.warning ? (
        <p className="mt-2 flex gap-1.5 text-caption text-status-amber">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {action.warning}
        </p>
      ) : null}
      {action.approval ? (
        <p className="mt-2 flex gap-1.5 text-caption text-ink-secondary">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Needs approval from {action.approval} after you confirm.
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {action.draftOnly ? (
            action.editHref ? (
              <Link href={action.editHref} className={cn(button, "bg-primary text-white")}>
                {action.confirmLabel}
              </Link>
            ) : null
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => choose("confirm")}
                className={cn(button, "bg-primary text-white hover:bg-primary-pressed")}
              >
                {action.confirmLabel}
              </button>
              {action.editHref ? (
                <Link href={action.editHref} className={cn(button, "bg-primary-tint text-primary")}>
                  Edit
                </Link>
              ) : null}
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("cancel")}
            className={cn(button, "bg-quiet text-ink-secondary hover:text-ink")}
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className={cn("mt-3 flex items-center gap-1.5 text-caption font-semibold", STATUS[action.status].tone)}>
          {action.status === "executed" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : action.status === "pending_approval" ? (
            <Clock className="h-4 w-4" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {STATUS[action.status].label}
          {action.result?.href ? (
            <Link href={action.result.href} className="ml-2 font-medium text-primary underline">
              Open
            </Link>
          ) : null}
        </p>
      )}
    </section>
  );
}
