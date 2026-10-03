"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markNotificationsReadApi } from "@/lib/api/notifications-client";

/** Opening the list counts as reading it. The page keeps showing which rows were new. */
export function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    markNotificationsReadApi()
      .then(() => router.refresh())
      .catch((error: unknown) => console.error("Couldn't mark notifications read", error));
  }, [hasUnread, router]);
  return null;
}
