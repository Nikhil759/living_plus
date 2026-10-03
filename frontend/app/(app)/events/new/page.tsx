import { AppPage } from "@/components/layout/app-page";
import { HostEventForm } from "@/components/events/host-event-form";
import { eventsWriteBackend, loadResident } from "@/lib/data";

export default async function NewEventPage() {
  const resident = await loadResident();
  const isCommittee = resident.roles.some((role) => /committee|admin/i.test(role));
  return (
    <AppPage title="Host an event" backHref="/events" backLabel="Events">
      <HostEventForm backend={eventsWriteBackend()} isCommittee={isCommittee} />
    </AppPage>
  );
}
