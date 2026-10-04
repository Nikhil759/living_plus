import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CreatePostForm } from "@/components/community/create-post-form";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isCommittee } from "@/lib/help-desk/access";
import { liveBackendEnabled, loadCommunity, loadResident } from "@/lib/data";

interface CreatePostPageProps {
  searchParams: Promise<{ groupId?: string }>;
}

export default async function CreatePostPage({ searchParams }: CreatePostPageProps) {
  const { groupId } = await searchParams;
  if (!liveBackendEnabled()) {
    return (
      <AppPage title="Create post" backHref="/community" backLabel="Community">
        <Card>
          <EmptyState
            icon={<MessageCircle />}
            title="Posting needs the live backend."
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
  const [catalog, resident] = await Promise.all([loadCommunity(), loadResident()]);
  return (
    <AppPage title="Create post" backHref="/community" backLabel="Community">
      <CreatePostForm
        groups={catalog.groups.filter((g) => g.joined)}
        initialGroupId={groupId}
        canPostNotice={isCommittee(resident)}
      />
    </AppPage>
  );
}
