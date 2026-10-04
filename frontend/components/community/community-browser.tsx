"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bike, Gamepad2, MessageCircle, Users } from "lucide-react";
import { JoinRequestQueue } from "@/components/community/join-request-queue";
import { WhatsappAction } from "@/components/community/whatsapp-action";
import { FeedPostItem } from "@/components/home/feed-post-item";
import { SectionHeader } from "@/components/home/section-header";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { FEED_FILTERS, type FeedFilter } from "@/lib/community/feed-labels";
import type { CommunityCatalog } from "@/lib/types/community";
import type { FeedPost } from "@/lib/types/home";
import type { Resident } from "@/lib/types/home";
import { cn } from "@/lib/utils";

export type CommunityTab = "feed" | "groups" | "whatsapp" | "people";

function groupIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("cycl") || n.includes("ride") || n.includes("run")) return <Bike />;
  if (n.includes("fifa") || n.includes("game")) return <Gamepad2 />;
  return <Users />;
}

export function CommunityBrowser({
  catalog,
  feedPosts,
  resident,
  writeEnabled = false,
  initialTab = "feed",
}: {
  catalog: CommunityCatalog;
  feedPosts: FeedPost[];
  resident: Resident;
  /** Live backend: requests, invites and admin approvals work. */
  writeEnabled?: boolean;
  /** Opened from a link like /community?tab=groups. */
  initialTab?: CommunityTab;
}) {
  const [tab, setTab] = useState<CommunityTab>(initialTab);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [interestFilter, setInterestFilter] = useState<string | null>(null);

  const myGroupNames = useMemo(
    () => new Set(catalog.groups.filter((g) => g.joined).map((g) => g.name)),
    [catalog.groups],
  );

  const sortedFeed = useMemo(() => {
    const pinned = feedPosts.filter((p) => p.pinned);
    const rest = feedPosts.filter((p) => !p.pinned).sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
    return [...pinned.slice(0, 2), ...rest];
  }, [feedPosts]);

  const filteredFeed = useMemo(() => {
    return sortedFeed.filter((post) => {
      if (feedFilter === "all") return true;
      if (feedFilter === "my_groups") {
        return post.groupName ? myGroupNames.has(post.groupName) : false;
      }
      if (feedFilter === "question") return post.postType === "question";
      if (feedFilter === "lost_found") return post.postType === "lost_found";
      if (feedFilter === "recommendation") return post.postType === "recommendation";
      return true;
    });
  }, [sortedFeed, feedFilter, myGroupNames]);

  const myGroups = catalog.groups.filter((g) => g.joined);
  const suggested = catalog.groups.filter((g) => g.suggested && !g.joined);
  const otherGroups = catalog.groups.filter((g) => !g.joined && !g.suggested);

  const neighbours = catalog.neighbours ?? [];
  const myInterests = new Set(resident.interests ?? []);
  const filteredNeighbours = neighbours.filter((n) => {
    if (!interestFilter) return true;
    return n.interests.some((i) => i.toLowerCase() === interestFilter.toLowerCase());
  });

  const interestOptions = useMemo(() => {
    const set = new Set<string>();
    for (const n of neighbours) for (const i of n.interests) set.add(i);
    return [...set].sort();
  }, [neighbours]);

  return (
    <div className="space-y-6">
      {writeEnabled ? <JoinRequestQueue /> : null}
      <nav className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Community sections">
        {(
          [
            ["feed", "Feed"],
            ["groups", "Groups"],
            ["whatsapp", "WhatsApp groups"],
            ["people", "People"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-callout font-medium",
              tab === key ? "bg-ink text-canvas" : "bg-quiet text-ink-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "feed" ? (
        <div className="space-y-5">
          <Link
            href="/community/post"
            className="block rounded-card border border-dashed border-outline-variant/50 bg-card p-4 text-callout text-ink-secondary shadow-card"
          >
            Create post — share with neighbours or a group
          </Link>
          <nav className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Feed filters">
            {FEED_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeedFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-caption font-medium",
                  feedFilter === f.id ? "bg-primary/10 text-primary" : "bg-quiet text-ink-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </nav>
          {filteredFeed.length === 0 ? (
            <EmptyState icon={<MessageCircle />} title="No posts match this filter" />
          ) : (
            <div className="space-y-8">
              {filteredFeed.map((post) => (
                <FeedPostItem key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "groups" ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader title="My groups" />
            <Link href="/community/new" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Start a group
            </Link>
          </div>
          <GroupedList>
            {myGroups.map((group) => (
              <ListRow
                key={group.id}
                href={`/community/groups/${group.id}`}
                title={group.name}
                detail={`${group.description} · ${group.memberCount} members`}
                leading={<IconTile>{groupIcon(group.name)}</IconTile>}
                trailing={<span className="text-caption text-primary">Joined</span>}
              />
            ))}
          </GroupedList>
          {suggested.length > 0 ? (
            <>
              <SectionHeader title="Suggested for you" />
              <GroupedList>
                {suggested.map((group) => (
                  <ListRow
                    key={group.id}
                    href={`/community/groups/${group.id}`}
                    title={group.name}
                    detail={`${group.description} · ${group.memberCount} members`}
                    leading={<IconTile>{groupIcon(group.name)}</IconTile>}
                    trailing={<span className="text-caption text-ink-secondary">Join</span>}
                  />
                ))}
              </GroupedList>
            </>
          ) : null}
          {otherGroups.length > 0 ? (
            <>
              <SectionHeader title="All groups" />
              <GroupedList>
                {otherGroups.map((group) => (
                  <ListRow
                    key={group.id}
                    href={`/community/groups/${group.id}`}
                    title={group.name}
                    detail={`${group.description} · ${group.memberCount} members · ${group.visibility ?? "public"}`}
                    leading={<IconTile>{groupIcon(group.name)}</IconTile>}
                  />
                ))}
              </GroupedList>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "whatsapp" ? (
        <GroupedList>
          {catalog.whatsappGroups.map((entry) => (
            <ListRow
              key={entry.id}
              title={entry.name}
              detail={`${entry.topic ?? "Society chat"} · ${entry.memberCount} members`}
              leading={
                <IconTile tone="quiet">
                  <MessageCircle />
                </IconTile>
              }
              trailing={
                writeEnabled ? (
                  <WhatsappAction entry={entry} />
                ) : entry.inviteLink ? (
                  <span className="text-caption text-primary">View invite</span>
                ) : (
                  <span className="text-caption text-ink-secondary">Request to join</span>
                )
              }
            />
          ))}
        </GroupedList>
      ) : null}

      {tab === "people" ? (
        <div className="space-y-4">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Interest filters">
            <button
              type="button"
              onClick={() => setInterestFilter(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-caption font-medium",
                !interestFilter ? "bg-ink text-canvas" : "bg-quiet text-ink-secondary",
              )}
            >
              All
            </button>
            {interestOptions.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => setInterestFilter(interest)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-caption font-medium",
                  interestFilter === interest ? "bg-primary/10 text-primary" : "bg-quiet text-ink-secondary",
                  myInterests.has(interest) ? "ring-1 ring-primary/30" : "",
                )}
              >
                {interest}
              </button>
            ))}
          </nav>
          <ul className="grid gap-3 sm:grid-cols-2">
            {filteredNeighbours.map((person) => (
              <li key={person.id} className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
                <Avatar name={person.firstName} src={person.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="text-headline text-ink">{person.firstName}</p>
                  <p className="text-caption text-ink-secondary">{person.tower}</p>
                  <p className="mt-1 text-caption text-ink-tertiary">
                    {person.interests.map((i) => (
                      <span
                        key={i}
                        className={myInterests.has(i) ? "font-medium text-primary" : undefined}
                      >
                        {i}
                        {person.interests.indexOf(i) < person.interests.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
