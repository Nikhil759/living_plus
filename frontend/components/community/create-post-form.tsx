"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPostApi } from "@/lib/api/community-client";
import { FEED_POST_TYPE_LABEL } from "@/lib/community/feed-labels";
import type { CommunityGroup } from "@/lib/types/community";
import type { FeedPostType } from "@/lib/types/home";

const field = "w-full rounded-tile border border-outline-variant/40 p-2.5 text-body";
const RESIDENT_TYPES: FeedPostType[] = ["general", "question", "recommendation", "lost_found", "alert"];

export function CreatePostForm({
  groups,
  initialGroupId,
  canPostNotice,
}: {
  /** Groups the resident belongs to; posting elsewhere needs membership. */
  groups: CommunityGroup[];
  initialGroupId?: string;
  canPostNotice: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<FeedPostType>("general");
  const [groupId, setGroupId] = useState(
    groups.some((g) => g.id === initialGroupId) ? initialGroupId ?? "" : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const types = canPostNotice && !groupId ? [...RESIDENT_TYPES, "notice" as const] : RESIDENT_TYPES;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createPostApi({ body, postType, groupId: groupId || undefined });
      router.push(groupId ? `/community/groups/${groupId}` : "/community");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5">
      <Card className="space-y-4 p-5">
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Post to</span>
          <select
            className={field}
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              if (e.target.value && postType === "notice") setPostType("general");
            }}
          >
            <option value="">Whole society</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Type</span>
          <select
            className={field}
            value={postType}
            onChange={(e) => setPostType(e.target.value as FeedPostType)}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {FEED_POST_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Message</span>
          <textarea
            className={field}
            rows={5}
            minLength={2}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share something with your neighbours"
            required
          />
          <span className="text-caption text-ink-tertiary">
            Please don&apos;t share anyone&apos;s flat or phone number.
          </span>
        </label>
      </Card>
      {error ? <p className="text-callout text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy || body.trim().length < 2}>
        Post
      </Button>
    </form>
  );
}
