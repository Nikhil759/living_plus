import { apiGetAsUser } from "@/lib/api/server-auth";
import type { ApiNotification } from "@/lib/types/notification";

export async function fetchNotifications(): Promise<ApiNotification[]> {
  return apiGetAsUser<ApiNotification[]>("/v1/notifications");
}
