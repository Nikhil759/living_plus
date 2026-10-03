"use client";

import { useEffect, useState } from "react";
import { BusinessCard } from "@/components/local-businesses/business-card";
import { fetchMyBusinessesApi } from "@/lib/api/local-businesses-client";
import type { BusinessCard as BusinessCardData } from "@/lib/types/local-business";

/** The viewer's own businesses, with their review state. Renders nothing when there are none. */
export function MyBusinesses() {
  const [items, setItems] = useState<BusinessCardData[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMyBusinessesApi(controller.signal)
      .then(setItems)
      .catch((error: unknown) => {
        // The strip is a convenience; the directory below still works without it.
        if (!controller.signal.aborted) console.error("My businesses failed to load", error);
      });
    return () => controller.abort();
  }, []);

  if (items.length === 0) return null;
  return (
    <section className="space-y-3" aria-label="Your businesses">
      <h2 className="text-headline text-ink">Your businesses</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {items.map((business) => (
          <li key={business.id} className="min-w-0">
            <BusinessCard business={business} />
          </li>
        ))}
      </ul>
    </section>
  );
}
