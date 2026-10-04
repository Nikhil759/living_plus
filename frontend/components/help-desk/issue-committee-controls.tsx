"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateIssueStatusApi } from "@/lib/api/help-desk-client";
import { TICKET_STATUS_LABEL } from "@/lib/help-desk-labels";
import type { HelpDeskIssue, HelpDeskIssueStatus, HelpDeskVendor } from "@/lib/types/help-desk";

const STATUSES: HelpDeskIssueStatus[] = ["open", "in_progress", "resolved", "closed"];
const field = "w-full rounded-tile border border-outline-variant/40 p-2.5 text-body";

/** Committee: move an issue along, add a note and assign a vendor. Followers are notified. */
export function IssueCommitteeControls({
  issue,
  vendors,
  onUpdated,
}: {
  issue: HelpDeskIssue;
  vendors: HelpDeskVendor[];
  onUpdated: (issue: HelpDeskIssue) => void;
}) {
  const [status, setStatus] = useState<HelpDeskIssueStatus>(issue.status);
  const [vendorId, setVendorId] = useState(issue.assignedVendorId ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unchanged =
    status === issue.status && vendorId === (issue.assignedVendorId ?? "") && !note.trim();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await updateIssueStatusApi(issue.id, { status, note, vendorId }));
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the issue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-headline text-ink">Committee</p>
      <label className="block space-y-1">
        <span className="text-callout font-medium text-ink">Status</span>
        <select
          className={field}
          value={status}
          onChange={(e) => setStatus(e.target.value as HelpDeskIssueStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-callout font-medium text-ink">Vendor</span>
        <select className={field} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">Not assigned</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-callout font-medium text-ink">Note to residents (optional)</span>
        <textarea
          className={field}
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {status === "resolved" && issue.status !== "resolved" ? (
        <p className="text-caption text-ink-tertiary">
          Residents on this issue will be asked to confirm it&apos;s fixed.
        </p>
      ) : null}
      <Button type="button" size="sm" onClick={save} disabled={busy || unchanged}>
        Save
      </Button>
      {error ? <p className="text-callout text-destructive">{error}</p> : null}
    </Card>
  );
}
