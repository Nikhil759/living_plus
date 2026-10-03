import Link from "next/link";
import { Waves } from "lucide-react";
import { AmenityFaIcon } from "@/components/amenities/amenity-fa-icon";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { amenityHref, amenityStatusLabel, amenityTone } from "@/lib/amenities/view";
import type { Amenity } from "@/lib/types/home";

export function AmenitiesSection({
  amenities,
  showSeeAll = true,
}: {
  amenities: Amenity[];
  showSeeAll?: boolean;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader
        title="Amenities right now"
        action={
          showSeeAll && amenities.length > 0
            ? { label: "See all", href: "/amenities" }
            : undefined
        }
      />
      {amenities.length === 0 ? (
        <EmptyState icon={<Waves />} title="No live amenity data" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {amenities.map((amenity) => (
            <li key={amenity.id}>
              <Link
                href={amenityHref(amenity.id)}
                className="block h-full rounded-tile bg-card p-4 shadow-card"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-tile bg-primary-tint text-primary">
                  <AmenityFaIcon name={amenity.name} />
                </span>
                <p className="mt-3 text-headline text-ink">{amenity.name}</p>
                <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-secondary">
                  <StatusDot tone={amenityTone(amenity.status)} />
                  {amenityStatusLabel(amenity)}
                </p>
                <p className="mt-1 text-caption text-ink-tertiary">{amenity.detail}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
