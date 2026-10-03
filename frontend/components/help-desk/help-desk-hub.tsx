"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { VendorRow } from "@/components/help-desk/vendor-row";
import { SectionHeader } from "@/components/home/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { isMyRequest, reporterCount, towerIssuesFor } from "@/lib/help-desk/access";
import { issueLocationLabel } from "@/lib/help-desk/format";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/help-desk-labels";
import type { HelpDeskIssue, HelpDeskVendor } from "@/lib/types/help-desk";
import type { Resident } from "@/lib/types/home";
import { formatFeedAge } from "@/lib/format";
import { cn } from "@/lib/utils";

type RequestTab = "open" | "resolved";

export function HelpDeskHub({
  issues,
  vendors,
  resident,
  viewerEmail,
  isCommittee,
}: {
  issues: HelpDeskIssue[];
  vendors: HelpDeskVendor[];
  resident: Resident;
  viewerEmail?: string | null;
  isCommittee: boolean;
}) {
  const [tab, setTab] = useState<RequestTab>("open");

  const myIssues = useMemo(
    () => issues.filter((issue) => isMyRequest(issue, resident, viewerEmail)),
    [issues, resident, viewerEmail],
  );

  const filteredMy = useMemo(() => {
    if (tab === "open") {
      return myIssues.filter((i) => i.status === "open" || i.status === "in_progress");
    }
    return myIssues.filter((i) => i.status === "resolved" || i.status === "closed");
  }, [myIssues, tab]);

  const towerIssues = useMemo(
    () => towerIssuesFor(issues, resident, viewerEmail),
    [issues, resident, viewerEmail],
  );

  return (
    <div className="space-y-8">
      {isCommittee ? (
        <p className="text-callout">
          <Link href="/help-desk/committee" className="font-semibold text-primary">
            Committee queue
          </Link>
          {" · "}
          Manage all society issues
        </p>
      ) : null}

      <section className="space-y-4">
        <SectionHeader title="My requests" adornment={<LifeBuoy className="h-5 w-5 text-ink-tertiary" strokeWidth={1.5} />} />
        <nav className="flex gap-2" aria-label="My request tabs">
          {(["open", "resolved"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-callout font-medium transition-colors",
                tab === key ? "bg-ink text-canvas" : "bg-quiet text-ink-secondary",
              )}
            >
              {key === "open" ? "Open" : "Resolved"}
            </button>
          ))}
        </nav>
        <GroupedList>
          {filteredMy.length === 0 ? (
            <p className="px-4 py-6 text-callout text-ink-secondary">No {tab} requests.</p>
          ) : (
            filteredMy.map((issue) => (
              <ListRow
                key={issue.id}
                href={`/help-desk/tickets/${issue.id}`}
                title={issue.title}
                detail={`${issue.number} · ${TICKET_CATEGORY_LABEL[issue.category]} · ${formatFeedAge(issue.createdAt)}`}
                trailing={
                  <Badge
                    dot={
                      issue.status === "closed"
                        ? "green"
                        : issue.status === "resolved"
                          ? "green"
                          : "amber"
                    }
                  >
                    {TICKET_STATUS_LABEL[issue.status]}
                  </Badge>
                }
              />
            ))
          )}
        </GroupedList>
      </section>

      {towerIssues.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title="Issues in my tower" />
          <GroupedList>
            {towerIssues.map((issue) => (
              <ListRow
                key={issue.id}
                href={`/help-desk/tickets/${issue.id}`}
                title={issue.title}
                detail={`${issueLocationLabel(issue)} · ${reporterCount(issue)} residents`}
                trailing={<Badge dot="amber">{TICKET_STATUS_LABEL[issue.status]}</Badge>}
              />
            ))}
          </GroupedList>
        </section>
      ) : null}

      <Card className="space-y-3">
        <SectionHeader title="Vendor directory" action={{ label: "See all", href: "/help-desk/directory" }} />
        <div className="space-y-2">
          {vendors.slice(0, 4).map((vendor) => (
            <VendorRow key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </Card>
    </div>
  );
}
