import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockNotifications } from "@/lib/mock/notifications";

export default function NotificationsPage() {
  return (
    <AppPage title="Notifications">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
      <ul className="mt-4 space-y-2">
        {mockNotifications.map((item) => (
          <li key={item.id}>
            <Card
              className={cn(
                "p-4",
                !item.read && "ring-1 ring-primary/30 bg-primary-fixed/20",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-label-lg text-on-surface">{item.title}</p>
                <span className="shrink-0 text-label-sm text-on-surface-variant">{item.time}</span>
              </div>
              <p className="mt-1 text-body-md text-on-surface-variant">{item.body}</p>
            </Card>
          </li>
        ))}
      </ul>
    </AppPage>
  );
}
