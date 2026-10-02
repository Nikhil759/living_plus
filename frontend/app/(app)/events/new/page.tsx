import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NewEventPage() {
  return (
    <AppPage title="Host an event">
      <Card>
        <EmptyState
          icon={<CalendarPlus />}
          title="Hosting and approvals connect to the API next."
          action={
            <Link href="/events" className="text-callout font-semibold text-primary">
              Browse events
            </Link>
          }
        />
      </Card>
    </AppPage>
  );
}
