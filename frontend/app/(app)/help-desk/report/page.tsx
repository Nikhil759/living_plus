import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function HelpDeskReportPage() {
  return (
    <AppPage title="Report an issue">
      <Card>
        <EmptyState
          icon={<AlertCircle />}
          title="Issue reporting connects to the API next."
          action={
            <Link href="/help-desk" className="text-callout font-semibold text-primary">
              Back to Help desk
            </Link>
          }
        />
      </Card>
    </AppPage>
  );
}
