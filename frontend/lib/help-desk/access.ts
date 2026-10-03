import type { HelpDeskIssue } from "@/lib/types/help-desk";
import type { Resident } from "@/lib/types/home";

function isCommittee(resident: Resident): boolean {
  return resident.roles.some((r) => /committee|admin|rep/i.test(r));
}

export function residentFollowsIssue(
  issue: HelpDeskIssue,
  resident: Resident,
  email?: string | null,
): boolean {
  if (issue.reporterIds.includes(resident.id)) return true;
  if (issue.followerIds.includes(resident.id)) return true;
  if (email && issue.reporterEmails.some((e) => e.toLowerCase() === email.toLowerCase())) {
    return true;
  }
  return false;
}

export function residentCanSeeIssue(
  issue: HelpDeskIssue,
  resident: Resident,
  email?: string | null,
): boolean {
  if (isCommittee(resident)) return true;
  if (issue.scope === "my_flat") {
    return residentFollowsIssue(issue, resident, email);
  }
  if (issue.scope === "common_area") {
    return issue.tower === resident.tower || residentFollowsIssue(issue, resident, email);
  }
  return false;
}

export function isMyRequest(
  issue: HelpDeskIssue,
  resident: Resident,
  email?: string | null,
): boolean {
  return residentFollowsIssue(issue, resident, email);
}

export function towerIssuesFor(
  issues: HelpDeskIssue[],
  resident: Resident,
  email?: string | null,
): HelpDeskIssue[] {
  return issues.filter(
    (issue) =>
      issue.scope === "common_area" &&
      issue.tower === resident.tower &&
      (issue.status === "open" || issue.status === "in_progress") &&
      !isMyRequest(issue, resident, email),
  );
}

export function reporterCount(issue: HelpDeskIssue): number {
  return new Set([...issue.reporterIds, ...issue.followerIds]).size;
}
