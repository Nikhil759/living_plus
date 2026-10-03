import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { issueAgeLabel, issueLocationLabel } from "@/lib/help-desk/format";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/help-desk-labels";
import { loadHelpDeskIssues, loadResident } from "@/lib/data";

export default async function HelpDeskCommitteePage() {
  const [issues, resident] = await Promise.all([loadHelpDeskIssues(), loadResident()]);
  const isCommittee = resident.roles.some((r) => /committee|admin|rep/i.test(r));
  if (!isCommittee) notFound();

  const sorted = [...issues].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <AppPage title="Committee queue" backHref="/help-desk" backLabel="Help desk">
      <p className="text-body text-ink-secondary">All society issues, oldest first. Urgent items older than 3 days are highlighted.</p>
      <GroupedList>
        {sorted.map((issue) => {
          const days = Math.floor(
            (Date.now() - new Date(issue.createdAt).getTime()) / (24 * 60 * 60 * 1000),
          );
          const highlight = issue.urgency === "urgent" && days >= 3;
          return (
            <ListRow
              key={issue.id}
              href={`/help-desk/tickets/${issue.id}`}
              title={issue.title}
              detail={`${TICKET_CATEGORY_LABEL[issue.category]} · ${issueLocationLabel(issue)} · ${issueAgeLabel(issue)}`}
              trailing={
                <Badge dot={highlight ? "amber" : issue.urgency === "urgent" ? "amber" : undefined}>
                  {TICKET_STATUS_LABEL[issue.status]}
                </Badge>
              }
            />
          );
        })}
      </GroupedList>
      <p className="text-caption text-ink-tertiary">
        Status changes, vendor assignment and merge tools connect to the API in a later phase. Open an issue to post committee updates via demo store comments.
      </p>
      <Link href="/help-desk/directory" className="text-callout font-semibold text-primary">
        Vendor directory
      </Link>
    </AppPage>
  );
}
