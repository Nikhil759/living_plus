import { AppPage } from "@/components/layout/app-page";
import { HostEventForm } from "@/components/events/host-event-form";
import { eventsWriteBackend, loadAmenities, loadResident } from "@/lib/data";
import { buildVenueOptions } from "@/lib/events/venues";

export default async function NewEventPage() {
  const [resident, amenities] = await Promise.all([
    loadResident(),
    loadAmenities().catch(() => []),
  ]);
  const isCommittee = resident.roles.some((role) => /committee|admin/i.test(role));
  return (
    <AppPage title="Host an event" backHref="/events" backLabel="Events">
      <HostEventForm
        backend={eventsWriteBackend()}
        isCommittee={isCommittee}
        venueOptions={buildVenueOptions(amenities, resident)}
      />
    </AppPage>
  );
}
