import type { HelpDeskIssue } from "@/lib/types/help-desk";

export function issueAgeLabel(issue: HelpDeskIssue, now = Date.now()): string {
  const start = new Date(issue.createdAt).getTime();
  const days = Math.max(0, Math.floor((now - start) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Opened today";
  if (days === 1) return "Open for 1 day";
  return `Open for ${days} days`;
}

export function issueLocationLabel(issue: HelpDeskIssue): string {
  if (issue.scope === "my_flat") {
    return `${issue.tower} · ${issue.areaLabel ?? "My flat"}`;
  }
  return [issue.tower, issue.areaLabel].filter(Boolean).join(" · ");
}

export function issueToListRow(issue: HelpDeskIssue): {
  id: string;
  title: string;
  category: HelpDeskIssue["category"];
  status: HelpDeskIssue["status"];
  createdAt: string;
  lastUpdate: string;
  number: string;
  urgency: HelpDeskIssue["urgency"];
} {
  const last = issue.timeline[0]?.message ?? issue.description;
  return {
    id: issue.id,
    title: issue.title,
    category: issue.category,
    status: issue.status,
    createdAt: issue.createdAt,
    lastUpdate: last,
    number: issue.number,
    urgency: issue.urgency,
  };
}
