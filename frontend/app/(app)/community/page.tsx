import Link from "next/link";
import { MessagesSquare, Users } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CommunityPage() {
  return (
    <AppPage title="Community">
      <Card className="space-y-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Users className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-headline-sm text-on-surface">Groups & neighbours</h2>
          <p className="text-body-md text-on-surface-variant">
            Interest groups, society feed, and the WhatsApp directory will live here once the
            backend is wired. For now, explore matches from Home or start a group.
          </p>
        </div>
        <Link href="/community/new" className={buttonVariants({ size: "md" })}>
          <MessagesSquare className="h-4 w-4" aria-hidden="true" />
          Start a group
        </Link>
      </Card>
    </AppPage>
  );
}
