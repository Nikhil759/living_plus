"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  commentIssueApi,
  confirmIssueFixedApi,
  joinIssueApi,
} from "@/lib/api/help-desk-client";
import { reporterCount, residentFollowsIssue } from "@/lib/help-desk/access";
import { issueAgeLabel, issueLocationLabel } from "@/lib/help-desk/format";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/help-desk-labels";
import type { HelpDeskIssue, HelpDeskVendor } from "@/lib/types/help-desk";
import type { Resident } from "@/lib/types/home";
import { formatFeedAge } from "@/lib/format";
export function IssueDetailClient({
  issue: initial,
  resident,
  viewerEmail,
  vendor,
  writeEnabled,
}: {
  issue: HelpDeskIssue;
  resident: Resident;
  viewerEmail?: string | null;
  vendor?: HelpDeskVendor;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState(initial);
  const [comment, setComment] = useState("");
  const [reopenNote, setReopenNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const write = writeEnabled;
  const following = residentFollowsIssue(issue, resident, viewerEmail);

  async function meToo() {
    if (!write) return;
    setBusy(true);
    setError(null);
    try {
      setIssue(await joinIssueApi(issue.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join issue.");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    if (!write || !comment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setIssue(await commentIssueApi(issue.id, comment));
      setComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmFixed(fixed: boolean) {
    if (!write) return;
    setBusy(true);
    setError(null);
    try {
      setIssue(await confirmIssueFixedApi(issue.id, fixed, reopenNote));
      setReopenNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update issue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-content space-y-6">
      <div className="space-y-2">
        <p className="text-caption text-ink-tertiary">{issue.number}</p>
        <h1 className="text-title text-ink">{issue.title}</h1>
        <p className="text-body text-ink-secondary">{issue.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-callout text-ink-secondary">
          <Badge>{TICKET_CATEGORY_LABEL[issue.category]}</Badge>
          <Badge dot={issue.urgency === "urgent" ? "amber" : undefined}>
            {issue.urgency === "urgent" ? "Urgent" : "Normal"}
          </Badge>
          <Badge dot="amber">{TICKET_STATUS_LABEL[issue.status]}</Badge>
          <span>{issueLocationLabel(issue)}</span>
          <span>·</span>
          <span>Reported by {reporterCount(issue)} residents</span>
          <span>·</span>
          <span>{issueAgeLabel(issue)}</span>
        </div>
        {vendor ? (
          <p className="text-callout text-ink-secondary">Vendor: {vendor.name}</p>
        ) : null}
      </div>

      {issue.scope === "common_area" && !following && write ? (
        <Button type="button" onClick={meToo} disabled={busy}>
          Me too
        </Button>
      ) : null}

      {issue.awaitingConfirmation ? (
        <Card className="space-y-3 p-4">
          <p className="text-headline text-ink">Was this fixed?</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => confirmFixed(true)} disabled={busy || !write}>
              Yes, close it
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => confirmFixed(false)}
              disabled={busy || !write}
            >
              No, reopen
            </Button>
          </div>
          <textarea
            className="w-full rounded-tile border border-outline-variant/40 p-3 text-body"
            placeholder="Short note if reopening (optional)"
            value={reopenNote}
            onChange={(e) => setReopenNote(e.target.value)}
            rows={2}
          />
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-headline text-ink">Updates</h2>
        <ul className="space-y-3">
          {issue.timeline.map((entry) => (
            <li key={entry.id} className="rounded-tile bg-quiet p-3">
              <p className="text-callout text-ink-secondary">
                {entry.actorName} · {formatFeedAge(entry.at)}
              </p>
              <p className="text-body text-ink">{entry.message}</p>
            </li>
          ))}
        </ul>
      </section>

      {following && write && issue.status !== "closed" ? (
        <Card className="space-y-3 p-4">
          <label className="text-callout font-medium text-ink" htmlFor="issue-comment">
            Add a comment
          </label>
          <textarea
            id="issue-comment"
            className="w-full rounded-tile border border-outline-variant/40 p-3 text-body"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="button" size="sm" onClick={submitComment} disabled={busy || !comment.trim()}>
            Post comment
          </Button>
        </Card>
      ) : null}

      {error ? <p className="text-callout text-destructive">{error}</p> : null}
      {!write ? (
        <p className="text-caption text-ink-tertiary">
          Updates and Me too need the local demo store (see frontend/.env.example).
        </p>
      ) : null}
    </div>
  );
}
