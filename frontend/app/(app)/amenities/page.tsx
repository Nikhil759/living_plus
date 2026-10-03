import { Waves } from "lucide-react";
import { AmenitiesBrowser } from "@/components/amenities/amenities-browser";
import { MyBookings } from "@/components/amenities/my-bookings";
import { AppPage } from "@/components/layout/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAmenities, loadMyBookings } from "@/lib/data";

export default async function AmenitiesPage() {
  const [amenities, bookings] = await Promise.all([loadAmenities(), loadMyBookings()]);

  return (
    <AppPage title="Amenities">
      {amenities.length === 0 ? (
        <EmptyState icon={<Waves />} title="No amenities yet" />
      ) : (
        <div className="space-y-6">
          <MyBookings bookings={bookings} />
          <AmenitiesBrowser amenities={amenities} />
        </div>
      )}
    </AppPage>
  );
}
