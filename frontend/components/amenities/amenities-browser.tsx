"use client";

import { Waves } from "lucide-react";
import { useState } from "react";
import { AmenityCard } from "@/components/amenities/amenity-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AMENITY_FILTERS, filterAmenities, type AmenityFilter } from "@/lib/amenities/view";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/lib/types/home";

export function AmenitiesBrowser({ amenities }: { amenities: Amenity[] }) {
  const [filter, setFilter] = useState<AmenityFilter>("all");
  const visible = filterAmenities(amenities, filter);

  return (
    <section className="space-y-5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Filter amenities">
        {AMENITY_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium",
              filter === item.id ? "bg-primary text-white" : "bg-quiet text-ink-secondary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={<Waves />} title="Nothing here yet" />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((amenity) => (
            <li key={amenity.id} className="min-w-0">
              <AmenityCard amenity={amenity} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
