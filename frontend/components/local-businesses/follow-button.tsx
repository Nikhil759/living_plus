"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/local-businesses/use-action";
import { followBusinessApi, unfollowBusinessApi } from "@/lib/api/local-businesses-client";

export function FollowButton({
  businessId,
  initialFollowing,
}: {
  businessId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const { busy, error, run } = useAction();

  async function toggle() {
    const detail = await run(() =>
      following ? unfollowBusinessApi(businessId) : followBusinessApi(businessId),
    );
    if (!detail) return;
    setFollowing(detail.viewer.following);
    router.refresh();
  }

  const Icon = following ? BellRing : Bell;
  return (
    <div className="min-w-0">
      <Button
        variant={following ? "primary" : "secondary"}
        className="w-full"
        aria-pressed={following}
        disabled={busy}
        onClick={() => void toggle()}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {following ? "Following" : "Follow"}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
