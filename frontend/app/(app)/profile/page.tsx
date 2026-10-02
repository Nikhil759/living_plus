import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AppPage } from "@/components/layout/app-page";
import { loadResident } from "@/lib/data";

export default async function ProfilePage() {
  const resident = await loadResident();

  return (
    <AppPage title="Profile">
      <Card className="flex items-center gap-4">
        <Avatar name={resident.name} src={resident.avatarUrl} size="md" />
        <div className="min-w-0">
          <h1 className="text-title text-ink">{resident.name}</h1>
          <p className="text-body text-ink-secondary">
            {resident.tower} · {resident.flat}
          </p>
          <p className="text-caption text-ink-tertiary">{resident.society}</p>
          {resident.roles[0] ? <Badge className="mt-2">{resident.roles[0]}</Badge> : null}
        </div>
      </Card>
    </AppPage>
  );
}
