import { notFound } from "next/navigation";
import { IssueDetailClient } from "@/components/help-desk/issue-detail-client";
import { AppPage } from "@/components/layout/app-page";
import { residentCanSeeIssue } from "@/lib/help-desk/access";
import {
  helpDeskWriteEnabled,
  loadHelpDeskIssueById,
  loadHelpDeskVendors,
  loadResident,
} from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function HelpDeskTicketPage({ params }: TicketPageProps) {
  const { id } = await params;
  const [issue, resident, vendors] = await Promise.all([
    loadHelpDeskIssueById(id),
    loadResident(),
    loadHelpDeskVendors(),
  ]);
  if (!issue) notFound();

  const supabase = await createServerSupabaseClient();
  const email =
    supabase != null ? (await supabase.auth.getUser()).data.user?.email ?? null : null;

  if (!residentCanSeeIssue(issue, resident, email)) notFound();

  const vendor = issue.assignedVendorId
    ? vendors.find((v) => v.id === issue.assignedVendorId)
    : undefined;

  return (
    <AppPage title="Issue" backHref="/help-desk" backLabel="Help desk">
      <IssueDetailClient
        issue={issue}
        resident={resident}
        viewerEmail={email}
        vendor={vendor}
        writeEnabled={helpDeskWriteEnabled()}
      />
    </AppPage>
  );
}
