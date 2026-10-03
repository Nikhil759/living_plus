import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { TICKET_STATUS_LABEL } from "@/lib/help-desk-labels";
import type { HelpDeskIssue } from "@/lib/types/help-desk";

export function ProfileMyRequests({ issues }: { issues: HelpDeskIssue[] }) {
  const open = issues
    .filter((i) => i.status === "open" || i.status === "in_progress")
    .slice(0, 3);
  return (
    <section className="space-y-4">
      <SectionHeader title="My requests" action={{ label: "See all", href: "/help-desk" }} />
      {open.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy />}
          title="No open requests"
          action={
            <Link href="/help-desk/report" className="text-callout font-semibold text-primary">
              Report an issue
            </Link>
          }
        />
      ) : (
        <GroupedList>
          {open.map((issue) => (
            <ListRow
              key={issue.id}
              href={`/help-desk/tickets/${issue.id}`}
              title={issue.title}
              detail={issue.number}
              trailing={
                <span className="text-caption text-ink-tertiary">
                  {TICKET_STATUS_LABEL[issue.status]}
                </span>
              }
            />
          ))}
        </GroupedList>
      )}
    </section>
  );
}
