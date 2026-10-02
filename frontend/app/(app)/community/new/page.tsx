import Link from "next/link";
import { Users } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NewCommunityGroupPage() {
  return (
    <AppPage title="Start a group">
      <Card>
        <EmptyState
          icon={<Users />}
          title="Group creation connects to the API next."
          action={
            <Link href="/community" className="text-callout font-semibold text-primary">
              Back to Community
            </Link>
          }
        />
      </Card>
    </AppPage>
  );
}
