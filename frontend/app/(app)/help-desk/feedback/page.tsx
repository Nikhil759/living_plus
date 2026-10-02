import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function HelpDeskFeedbackPage() {
  return (
    <AppPage title="Feedback">
      <Card>
        <EmptyState
          icon={<MessageSquarePlus />}
          title="Feedback forms connect to the API next."
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
