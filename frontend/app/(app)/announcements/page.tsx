import { Droplets, FileText, Package, Sparkles } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { loadAnnouncements } from "@/lib/data";

function noticeIcon(lead: string) {
  const key = lead.toLowerCase();
  if (key.includes("water")) return <Droplets />;
  if (key.includes("mail") || key.includes("package")) return <Package />;
  if (key.includes("mela") || key.includes("sparkle")) return <Sparkles />;
  return <FileText />;
}

export default async function AnnouncementsPage() {
  const items = await loadAnnouncements();

  return (
    <AppPage title="Notices">
      {items.length === 0 ? (
        <EmptyState icon={<FileText />} title="No notices right now" />
      ) : (
        <GroupedList>
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={item.lead.replace(/:$/, "")}
              detail={item.body}
              leading={<IconTile>{noticeIcon(item.lead)}</IconTile>}
              chevron={false}
            />
          ))}
        </GroupedList>
      )}
    </AppPage>
  );
}
