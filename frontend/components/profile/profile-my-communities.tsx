import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import type { CommunityGroup, WhatsappGroupEntry } from "@/lib/types/community";

interface ProfileMyCommunitiesProps {
  groups: CommunityGroup[];
  whatsappGroups: WhatsappGroupEntry[];
}

export function ProfileMyCommunities({ groups, whatsappGroups }: ProfileMyCommunitiesProps) {
  const hasAny = groups.length > 0 || whatsappGroups.length > 0;

  return (
    <section className="space-y-4">
      <SectionHeader title="My communities" action={{ label: "Explore", href: "/community" }} />
      {!hasAny ? (
        <EmptyState
          icon={<Users />}
          title="No groups yet"
          action={
            <Link href="/community" className="text-callout font-semibold text-primary">
              Browse community
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
              detail={`${group.memberCount} members · ${group.description}`}
              leading={
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tile bg-primary-tint text-lg"
                  aria-hidden
                >
                  {group.emoji}
                </span>
              }
            />
          ))}
          {whatsappGroups.map((entry) => (
            <ListRow
              key={entry.id}
              href="/community"
              title={entry.name}
              detail={`WhatsApp · ${entry.memberCount} members`}
              leading={
                <IconTile tone="quiet">
                  <MessageCircle />
                </IconTile>
              }
            />
          ))}
        </GroupedList>
      )}
    </section>
  );
}
