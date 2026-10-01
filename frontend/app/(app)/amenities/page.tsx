import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { AmenityChip } from "@/components/home/amenity-chip";
import { Card } from "@/components/ui/card";
import { mockHomeData } from "@/lib/mock/home";

export default function AmenitiesPage() {
  const amenities = mockHomeData.amenities;

  return (
    <AppPage title="Amenities">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
      <Card className="mt-4 space-y-4 p-5">
        <p className="text-body-md text-on-surface-variant">
          Live occupancy from mock data. Booking slots will open once the amenities API is live.
        </p>
        <ul className="flex flex-wrap gap-2">
          {amenities.map(({ id, ...amenity }) => (
            <AmenityChip key={id} {...amenity} />
          ))}
        </ul>
      </Card>
    </AppPage>
  );
}
