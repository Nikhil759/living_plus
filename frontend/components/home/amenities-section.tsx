import { Waves } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AmenityChip } from "@/components/home/amenity-chip";
import { SectionHeader } from "@/components/home/section-header";
import type { Amenity } from "@/lib/types/home";

export interface AmenitiesSectionProps {
  amenities: Amenity[];
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
    </span>
  );
}

export function AmenitiesSection({ amenities }: AmenitiesSectionProps) {
  const hasAmenities = amenities.length > 0;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader
          title="Amenities right now"
          adornment={hasAmenities ? <LiveDot /> : undefined}
          action={hasAmenities ? { label: "Book", href: "/amenities" } : undefined}
        />
        {hasAmenities ? (
          <span className="shrink-0 text-label-sm text-on-surface-variant">
            Live occupancy
          </span>
        ) : null}
      </div>

      {hasAmenities ? (
        <ul className="flex flex-wrap gap-2">
          {amenities.map(({ id, ...amenity }) => (
            <AmenityChip key={id} {...amenity} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Waves className="h-6 w-6" aria-hidden="true" />}
          title="No live amenity data"
          description="Gym, pool and court availability will show up here once your society connects them."
        />
      )}
    </section>
  );
}
