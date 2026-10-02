import { Waves } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { AmenitiesSection } from "@/components/home/amenities-section";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAmenities } from "@/lib/data";

export default async function AmenitiesPage() {
  const amenities = await loadAmenities();

  return (
    <AppPage title="Amenities">
      {amenities.length === 0 ? (
        <EmptyState icon={<Waves />} title="No live amenity data" />
      ) : (
        <AmenitiesSection amenities={amenities} showSeeAll={false} />
      )}
    </AppPage>
  );
}
