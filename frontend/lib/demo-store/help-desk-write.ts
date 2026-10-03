import { randomUUID } from "node:crypto";
import { getDemoDb } from "@/lib/demo-store/db";
import { demoGetHelpDeskIssueById, demoGetHelpDeskIssues } from "@/lib/demo-store/readers";
import { demoGetResidentForUser } from "@/lib/demo-store/readers";
import type {
  HelpDeskCategory,
  HelpDeskIssue,
  HelpDeskIssueScope,
  HelpDeskUrgency,
} from "@/lib/types/help-desk";

function upsertIssue(issue: HelpDeskIssue): HelpDeskIssue {
  const db = getDemoDb();
  db.prepare(
    `INSERT INTO demo_entity (collection, id, payload) VALUES (?, ?, ?)
     ON CONFLICT(collection, id) DO UPDATE SET payload = excluded.payload`,
  ).run("help_desk_issues", issue.id, JSON.stringify(issue));
  return issue;
}

function nextNumber(): string {
  const issues = demoGetHelpDeskIssues();
  const max = issues.reduce((acc, row) => {
    const n = parseInt(row.number.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 1000);
  return `HD-${max + 1}`;
}

export interface CreateIssueInput {
  category: HelpDeskCategory;
  scope: HelpDeskIssueScope;
  tower: string;
  areaLabel?: string;
  title: string;
  description: string;
  urgency: HelpDeskUrgency;
  photoUrls?: string[];
}

export function demoCreateIssue(userId: string, input: CreateIssueInput): HelpDeskIssue {
  const resident = demoGetResidentForUser(userId);
  const now = new Date().toISOString();
  const issue: HelpDeskIssue = {
    id: `tkt-${randomUUID().slice(0, 8)}`,
    number: nextNumber(),
    title: input.title.trim().slice(0, 80),
    description: input.description.trim().slice(0, 500),
    category: input.category,
    scope: input.scope,
    tower: input.tower,
    areaLabel: input.areaLabel?.trim(),
    urgency: input.urgency,
    status: "open",
    createdAt: now,
    reporterIds: [resident.id],
    reporterEmails: [],
    followerIds: [resident.id],
    photoUrls: input.photoUrls?.slice(0, 3) ?? [],
    timeline: [
      {
        id: randomUUID(),
        kind: "created",
        at: now,
        actorName: resident.name,
        actorRole: "resident",
        message: "Opened the ticket.",
      },
    ],
  };
  return upsertIssue(issue);
}

export function demoJoinIssue(userId: string, issueId: string): HelpDeskIssue {
  const issue = demoGetHelpDeskIssueById(issueId);
  if (!issue) throw new Error("Issue not found.");
  if (issue.scope !== "common_area") throw new Error("Only common-area issues support Me too.");
  const resident = demoGetResidentForUser(userId);
  if (issue.followerIds.includes(resident.id)) return issue;
  const updated: HelpDeskIssue = {
    ...issue,
    followerIds: [...issue.followerIds, resident.id],
    timeline: [
      {
        id: randomUUID(),
        kind: "comment",
        at: new Date().toISOString(),
        actorName: resident.name,
        actorRole: "resident",
        message: "Marked Me too on this issue.",
      },
      ...issue.timeline,
    ],
  };
  return upsertIssue(updated);
}

export function demoAddIssueComment(
  userId: string,
  issueId: string,
  message: string,
): HelpDeskIssue {
  const issue = demoGetHelpDeskIssueById(issueId);
  if (!issue) throw new Error("Issue not found.");
  const resident = demoGetResidentForUser(userId);
  const updated: HelpDeskIssue = {
    ...issue,
    timeline: [
      {
        id: randomUUID(),
        kind: "comment",
        at: new Date().toISOString(),
        actorName: resident.name,
        actorRole: "resident",
        message: message.trim().slice(0, 500),
      },
      ...issue.timeline,
    ],
  };
  return upsertIssue(updated);
}

export function demoConfirmIssueFixed(
  userId: string,
  issueId: string,
  fixed: boolean,
  note?: string,
): HelpDeskIssue {
  const issue = demoGetHelpDeskIssueById(issueId);
  if (!issue) throw new Error("Issue not found.");
  const resident = demoGetResidentForUser(userId);
  const now = new Date().toISOString();
  const updated: HelpDeskIssue = {
    ...issue,
    status: fixed ? "closed" : "open",
    awaitingConfirmation: false,
    timeline: [
      {
        id: randomUUID(),
        kind: "status",
        at: now,
        actorName: resident.name,
        actorRole: "resident",
        message: fixed
          ? "Confirmed the issue is fixed."
          : `Reopened: ${note?.trim() || "Still not resolved."}`,
      },
      ...issue.timeline,
    ],
  };
  return upsertIssue(updated);
}
