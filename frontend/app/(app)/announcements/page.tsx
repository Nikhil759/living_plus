import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { getAnnouncements } from "@/lib/mock/announcements";

export default function AnnouncementsPage() {
  const items = getAnnouncements();

  return (
    <AppPage title="Announcements">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card className="flex items-start gap-3 p-4">
              <span aria-hidden="true" className="text-xl">
                {item.emoji}
              </span>
              <p className="text-body-md text-on-surface">
                <strong className="font-semibold">{item.lead}</strong> {item.body}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </AppPage>
  );
}
