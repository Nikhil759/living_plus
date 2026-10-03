import { FeedbackForm } from "@/components/help-desk/feedback-form";
import { AppPage } from "@/components/layout/app-page";
import { helpDeskWriteEnabled } from "@/lib/data";

export default async function HelpDeskFeedbackPage() {
  return (
    <AppPage title="Give feedback" backHref="/help-desk" backLabel="Help desk">
      <FeedbackForm writeEnabled={helpDeskWriteEnabled()} />
    </AppPage>
  );
}
