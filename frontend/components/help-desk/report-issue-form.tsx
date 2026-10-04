"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createIssueApi, joinIssueApi } from "@/lib/api/help-desk-client";
import { reporterCount } from "@/lib/help-desk/access";
import { similarOpenIssues } from "@/lib/help-desk/similar";
import { REPORT_CATEGORIES, TICKET_CATEGORY_LABEL } from "@/lib/help-desk-labels";
import type { HelpDeskCategory, HelpDeskIssue, HelpDeskIssueScope, HelpDeskUrgency } from "@/lib/types/help-desk";
import type { Resident } from "@/lib/types/home";

export function ReportIssueForm({
  issues,
  resident,
  writeEnabled,
  towers,
}: {
  issues: HelpDeskIssue[];
  resident: Resident;
  writeEnabled: boolean;
  /** API mode: the society's towers, so the issue is filed against a real tower. */
  towers?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<HelpDeskCategory>("lift");
  const [scope, setScope] = useState<HelpDeskIssueScope>("common_area");
  const [tower, setTower] = useState(resident.tower);
  const [areaLabel, setAreaLabel] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<HelpDeskUrgency>("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedNumber, setConfirmedNumber] = useState<string | null>(null);

  const similar = useMemo(() => {
    if (scope !== "common_area") return [];
    return similarOpenIssues(issues, category, tower);
  }, [issues, category, tower, scope]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!writeEnabled) return;
    setBusy(true);
    setError(null);
    try {
      const issue = await createIssueApi({
        category,
        scope,
        tower,
        towerId: towers?.find((t) => t.name === tower)?.id,
        areaLabel: scope === "common_area" ? areaLabel : `${resident.flat}`,
        title,
        description,
        urgency,
      });
      setConfirmedNumber(issue.number);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit issue.");
    } finally {
      setBusy(false);
    }
  }

  async function meToo(id: string) {
    if (!writeEnabled) return;
    setBusy(true);
    try {
      await joinIssueApi(id);
      router.push(`/help-desk/tickets/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join issue.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmedNumber) {
    return (
      <Card className="space-y-3 p-6">
        <p className="text-headline text-ink">Issue logged</p>
        <p className="text-body text-ink-secondary">
          Your reference is <strong>{confirmedNumber}</strong>. It appears under My requests → Open.
        </p>
        <Link href="/help-desk" className="text-callout font-semibold text-primary">
          Back to Help desk
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5">
      <Card className="space-y-4 p-5">
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Category</span>
          <select
            className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
            value={category}
            onChange={(e) => setCategory(e.target.value as HelpDeskCategory)}
            required
          >
            {REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TICKET_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-callout font-medium text-ink">Where</legend>
          <label className="flex items-center gap-2 text-body">
            <input
              type="radio"
              name="scope"
              checked={scope === "my_flat"}
              onChange={() => setScope("my_flat")}
            />
            My flat (private to you and committee)
          </label>
          <label className="flex items-center gap-2 text-body">
            <input
              type="radio"
              name="scope"
              checked={scope === "common_area"}
              onChange={() => setScope("common_area")}
            />
            Common area
          </label>
          {scope === "common_area" ? (
            <input
              className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
              placeholder='Tower / area (e.g. "Tower B lift 2")'
              value={areaLabel}
              onChange={(e) => setAreaLabel(e.target.value)}
              required
            />
          ) : null}
        </fieldset>

        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Tower</span>
          {towers?.length ? (
            <select
              className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
              value={tower}
              onChange={(e) => setTower(e.target.value)}
              required
            >
              {towers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
              value={tower}
              onChange={(e) => setTower(e.target.value)}
              required
            />
          )}
        </label>

        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Title</span>
          <input
            className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Description</span>
          <textarea
            className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
            maxLength={500}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-callout font-medium text-ink">Urgency</legend>
          <label className="flex items-center gap-2 text-body">
            <input
              type="radio"
              name="urgency"
              checked={urgency === "normal"}
              onChange={() => setUrgency("normal")}
            />
            Normal
          </label>
          <label className="flex items-center gap-2 text-body">
            <input
              type="radio"
              name="urgency"
              checked={urgency === "urgent"}
              onChange={() => setUrgency("urgent")}
            />
            Urgent
          </label>
          <p className="text-caption text-ink-tertiary">
            Urgent = safety risk, someone stuck, no water or power.
          </p>
        </fieldset>
      </Card>

      {similar.length > 0 ? (
        <Card className="space-y-3 p-5">
          <p className="text-headline text-ink">Similar open issues</p>
          <ul className="space-y-2">
            {similar.map((issue: HelpDeskIssue) => (
              <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-quiet p-3">
                <div>
                  <p className="text-callout font-medium text-ink">{issue.title}</p>
                  <p className="text-caption text-ink-secondary">
                    {reporterCount(issue)} residents · {TICKET_CATEGORY_LABEL[issue.category]}
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" disabled={busy || !writeEnabled} onClick={() => meToo(issue.id)}>
                  Me too
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {error ? <p className="text-callout text-destructive">{error}</p> : null}
      {!writeEnabled ? (
        <p className="text-caption text-ink-tertiary">
          Submitting issues requires the local demo SQLite store. On production API mode you can browse existing tickets.
        </p>
      ) : null}

      <Button type="submit" disabled={busy || !writeEnabled || !title.trim()}>
        Submit issue
      </Button>
    </form>
  );
}
