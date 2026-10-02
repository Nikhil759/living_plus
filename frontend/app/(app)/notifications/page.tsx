import { Bell } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { mockNotifications } from "@/lib/mock/notifications";

export default function NotificationsPage() {
  return (
    <AppPage title="Notifications">
      {mockNotifications.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications yet" />
      ) : (
        <GroupedList>
          {mockNotifications.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              detail={`${item.body} · ${item.time}`}
              chevron={false}
            />
          ))}
        </GroupedList>
      )}
    </AppPage>
  );
}
