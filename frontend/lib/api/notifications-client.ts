"use client";

import { apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";

/** Marks every notification read; the bell's unread dot clears on the next refresh. */
export async function markNotificationsReadApi(): Promise<void> {
  const token = await getBrowserAccessToken();
  await apiPost<void>("/v1/notifications/read-all", undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
