import { Waves } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import type { Amenity, AmenityStatus } from "@/lib/types/home";

function statusTone(status: AmenityStatus): StatusTone {
  if (status === "booked") return "red";
  if (status === "moderate") return "amber";
  return "green";
}

function statusLabel(status: AmenityStatus): string {
  if (status === "booked") return "Busy";
  if (status === "moderate") return "Moderate";
  if (status === "quiet") return "Quiet";
  if (status === "free" || status === "open") return "Quiet";
  return status;
}

export function AmenitiesSection({ amenities }: { amenities: Amenity[] }) {
  return (
    <section className="space-y-5">
      <SectionHeader
        title="Amenities right now"
        action={amenities.length > 0 ? { label: "See all", href: "/amenities" } : undefined}
      />
      {amenities.length === 0 ? (
        <EmptyState icon={<Waves />} title="No live amenity data" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {amenities.map((amenity) => (
            <li
              key={amenity.id}
              className="rounded-tile bg-card p-4 shadow-card"
            >
              <p className="text-headline text-ink">{amenity.name}</p>
              <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-secondary">
                <StatusDot tone={statusTone(amenity.status)} />
                {statusLabel(amenity.status)}
              </p>
              <p className="mt-1 text-caption text-ink-tertiary">{amenity.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
