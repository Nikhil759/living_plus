import type { HelpDeskCategory, HelpDeskIssue } from "@/lib/types/help-desk";

export function similarOpenIssues(
  issues: HelpDeskIssue[],
  category: HelpDeskCategory,
  tower: string,
): HelpDeskIssue[] {
  return issues.filter(
    (issue) =>
      issue.category === category &&
      issue.tower === tower &&
      issue.scope === "common_area" &&
      (issue.status === "open" || issue.status === "in_progress"),
  );
}
