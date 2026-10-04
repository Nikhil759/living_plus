import { notFound } from "next/navigation";
import { NoticeForm } from "@/components/guide/notice-form";
import { AppPage } from "@/components/layout/app-page";
import { isCommittee } from "@/lib/help-desk/access";
import { liveBackendEnabled, loadResident } from "@/lib/data";

export default async function NewNoticePage() {
  const resident = await loadResident();
  if (!liveBackendEnabled() || !isCommittee(resident)) notFound();
  return (
    <AppPage title="Add notice" backHref="/guide" backLabel="Society guide">
      <NoticeForm />
    </AppPage>
  );
}
