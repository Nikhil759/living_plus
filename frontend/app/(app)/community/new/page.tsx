import Link from "next/link";
import { Users } from "lucide-react";
import { StartGroupForm } from "@/components/community/start-group-form";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { liveBackendEnabled } from "@/lib/data";

export default function NewCommunityGroupPage() {
  return (
    <AppPage title="Start a group" backHref="/community" backLabel="Community">
      {liveBackendEnabled() ? (
        <StartGroupForm />
      ) : (
        <Card>
          <EmptyState
            icon={<Users />}
            title="Starting a group needs the live backend."
            action={
              <Link href="/community" className="text-callout font-semibold text-primary">
                Back to Community
              </Link>
            }
          />
        </Card>
      )}
    </AppPage>
  );
}
