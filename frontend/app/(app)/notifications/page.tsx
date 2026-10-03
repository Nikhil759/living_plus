import { Bell } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { MarkNotificationsRead } from "@/components/notifications/mark-read";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { fetchNotifications } from "@/lib/api/notifications";
import { marketplaceIsLive } from "@/lib/data";
import { shortAgo } from "@/lib/local-businesses/view";
import { mockNotifications } from "@/lib/mock/notifications";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  time: string;
  href?: string;
  unread: boolean;
}

async function loadRows(): Promise<NotificationRow[]> {
  if (!marketplaceIsLive()) {
    return mockNotifications.map((item) => ({ ...item, unread: !item.read }));
  }
  const items = await fetchNotifications();
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    time: shortAgo(item.createdAt),
    href: item.href ?? undefined,
    unread: !item.read,
  }));
}

export default async function NotificationsPage() {
  const rows = await loadRows();
  const hasUnread = marketplaceIsLive() && rows.some((row) => row.unread);

  return (
    <AppPage title="Notifications">
      <MarkNotificationsRead hasUnread={hasUnread} />
      {rows.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications yet" />
      ) : (
        <GroupedList>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              href={row.href}
              title={row.title}
              detail={`${row.body} · ${row.time}`}
              chevron={Boolean(row.href)}
              trailing={
                row.unread ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" role="img" aria-label="Unread" />
                ) : null
              }
            />
          ))}
        </GroupedList>
      )}
    </AppPage>
  );
}
