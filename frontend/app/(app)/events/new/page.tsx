import { AppPage } from "@/components/layout/app-page";
import { HostEventForm } from "@/components/events/host-event-form";
import { eventsWriteBackend, loadAmenities, loadResident, loadSaarthiDraft } from "@/lib/data";
import { eventPrefill } from "@/lib/saarthi/prefill";
import { buildVenueOptions } from "@/lib/events/venues";

interface NewEventPageProps {
  searchParams: Promise<{ venue?: string; saarthiAction?: string }>;
}

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const { venue, saarthiAction } = await searchParams;
  const [resident, amenities, draft] = await Promise.all([
    loadResident(),
    loadAmenities().catch(() => []),
    loadSaarthiDraft(saarthiAction),
  ]);
  const isCommittee = resident.roles.some((role) => /committee|admin/i.test(role));
  return (
    <AppPage title="Host an event" backHref="/events" backLabel="Events">
      <HostEventForm
        backend={eventsWriteBackend()}
        isCommittee={isCommittee}
        venueOptions={buildVenueOptions(amenities, resident)}
        presetVenue={venue}
        prefill={draft ? eventPrefill(draft) : undefined}
      />
    </AppPage>
  );
}
