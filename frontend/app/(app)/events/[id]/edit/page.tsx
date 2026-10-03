import { notFound, redirect } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { HostEventForm } from "@/components/events/host-event-form";
import { eventsWriteBackend, loadEventById } from "@/lib/data";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const event = await loadEventById(id);
  if (!event) notFound();
  if (!event.isHost && !event.isCommittee) redirect(`/events/${event.id}`);

  return (
    <AppPage title="Edit event" backHref={`/events/${event.id}`} backLabel="Event">
      <HostEventForm
        backend={eventsWriteBackend()}
        event={event}
        isCommittee={Boolean(event.isCommittee)}
      />
    </AppPage>
  );
}
