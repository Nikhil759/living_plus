import { ReportIssueForm } from "@/components/help-desk/report-issue-form";
import { AppPage } from "@/components/layout/app-page";
import { helpDeskWriteEnabled, loadHelpDeskIssues, loadResident } from "@/lib/data";

export default async function HelpDeskReportPage() {
  const [issues, resident] = await Promise.all([loadHelpDeskIssues(), loadResident()]);
  return (
    <AppPage title="Report an issue" backHref="/help-desk" backLabel="Help desk">
      <ReportIssueForm issues={issues} resident={resident} writeEnabled={helpDeskWriteEnabled()} />
    </AppPage>
  );
}
