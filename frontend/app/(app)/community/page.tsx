import Link from "next/link";
import { Bike, Flower2, Gamepad2, MessageCircle, Users } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { SectionHeader } from "@/components/home/section-header";
import { FeedPostItem } from "@/components/home/feed-post-item";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { loadCommunity, loadFeedPosts } from "@/lib/data";

function groupIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("cycl") || n.includes("ride")) return <Bike />;
  if (n.includes("fifa") || n.includes("game")) return <Gamepad2 />;
  if (n.includes("yoga")) return <Flower2 />;
  return <Users />;
}

export default async function CommunityPage() {
  const [{ groups, whatsappGroups }, feedPosts] = await Promise.all([
    loadCommunity(),
    loadFeedPosts(),
  ]);

  return (
    <AppPage title="Community">
      <section className="space-y-5">
        <SectionHeader title="From your neighbours" />
        {feedPosts.length === 0 ? (
          <EmptyState icon={<MessageCircle />} title="No posts yet" />
        ) : (
          <div className="space-y-8">
            {feedPosts.map((post) => (
              <FeedPostItem key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <SectionHeader title="Interest groups" />
        {groups.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No groups yet"
            action={
              <Link href="/community/new" className="text-callout font-semibold text-primary">
                Start a group
              </Link>
            }
          />
        ) : (
          <GroupedList>
            {groups.map((group) => (
              <ListRow
                key={group.id}
                href="/community"
                title={group.name}
                detail={`${group.description} · ${group.memberCount} members`}
                leading={<IconTile>{groupIcon(group.name)}</IconTile>}
              />
            ))}
          </GroupedList>
        )}
        <Link href="/community/new" className={buttonVariants({ variant: "secondary" })}>
          Start a group
        </Link>
      </section>

      <section className="space-y-5">
        <SectionHeader title="WhatsApp directory" />
        <GroupedList>
          {whatsappGroups.map((entry) => (
            <ListRow
              key={entry.id}
              title={entry.name}
              detail={`${entry.memberCount} members`}
              leading={
                <IconTile tone="quiet">
                  <MessageCircle />
                </IconTile>
              }
            />
          ))}
        </GroupedList>
      </section>
    </AppPage>
  );
}
