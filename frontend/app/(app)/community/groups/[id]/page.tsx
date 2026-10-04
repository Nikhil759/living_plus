import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupActions } from "@/components/community/group-actions";
import { FeedPostItem } from "@/components/home/feed-post-item";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { liveBackendEnabled, loadCommunityGroup } from "@/lib/data";

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export default async function CommunityGroupPage({ params }: GroupPageProps) {
  const { id } = await params;
  const group = await loadCommunityGroup(id);
  if (!group) notFound();
  const live = liveBackendEnabled();

  return (
    <AppPage title={group.name} backHref="/community" backLabel="Community">
      <div className="mx-auto max-w-content space-y-6">
        <div className="space-y-3">
          <p className="text-4xl" aria-hidden="true">
            {group.emoji}
          </p>
          <p className="text-body text-ink-secondary">{group.description}</p>
          <p className="text-callout text-ink-tertiary">
            {group.memberCount} members · {group.visibility ?? "public"} group
          </p>
          {live ? (
            <GroupActions group={group} />
          ) : (
            <Link href="/events" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Upcoming events
            </Link>
          )}
        </div>
        {live ? (
          <section className="space-y-5">
            <h2 className="text-headline text-ink">Posts</h2>
            {group.posts.length === 0 ? (
              <p className="text-callout text-ink-tertiary">
                {group.visibility === "private" && !group.joined
                  ? "Posts are visible to members."
                  : "No posts yet."}
              </p>
            ) : (
              <div className="space-y-8">
                {group.posts.map((post) => (
                  <FeedPostItem key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </AppPage>
  );
}
