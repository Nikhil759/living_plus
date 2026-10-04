"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { joinGroupApi, leaveGroupApi } from "@/lib/api/community-client";
import type { CommunityGroup } from "@/lib/types/community";

export function GroupActions({ group: initial }: { group: CommunityGroup }) {
  const router = useRouter();
  const [group, setGroup] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<CommunityGroup>) {
    setBusy(true);
    setError(null);
    try {
      setGroup(await action());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {group.joined ? (
          <>
            <Link
              href={`/community/post?groupId=${encodeURIComponent(group.id)}`}
              className={buttonVariants({ size: "sm" })}
            >
              Post in this group
            </Link>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => leaveGroupApi(group.id))}
            >
              Leave group
            </Button>
          </>
        ) : group.pending ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            Request sent
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={busy} onClick={() => run(() => joinGroupApi(group.id))}>
            {group.visibility === "private" ? "Request to join" : "Join group"}
          </Button>
        )}
      </div>
      {error ? <p className="text-callout text-destructive">{error}</p> : null}
    </div>
  );
}
