import { AppPage } from "@/components/layout/app-page";
import { HostEventForm } from "@/components/events/host-event-form";
import { eventsWriteBackend } from "@/lib/data";

export default function NewEventPage() {
  return (
    <AppPage title="Host an event" backHref="/events" backLabel="Events">
      <HostEventForm backend={eventsWriteBackend()} />
    </AppPage>
  );
}
