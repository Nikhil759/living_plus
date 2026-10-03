"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionHeader } from "@/components/home/section-header";
import { Button } from "@/components/ui/button";
import { cancelBookingApi } from "@/lib/api/amenities-client";
import { formatBookingDay, formatSlotRange } from "@/lib/amenities/view";
import type { AmenityBooking } from "@/lib/types/amenities";

export function MyBookings({ bookings }: { bookings: AmenityBooking[] }) {
  const router = useRouter();
  const [items, setItems] = useState(bookings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await cancelBookingApi(id);
      setItems((current) => current.filter((item) => item.id !== id));
      router.refresh();
    } catch {
      setError("Couldn't cancel that booking. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="My bookings" />
      <ul className="divide-y divide-outline-variant/25 rounded-card bg-card px-5 shadow-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-headline text-ink">{item.amenityName}</p>
              <p className="text-caption text-ink-secondary">
                {formatBookingDay(item.startsAt)} · {formatSlotRange(item.startsAt, item.endsAt)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={busyId === item.id}
              onClick={() => cancel(item.id)}
            >
              Cancel
            </Button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </section>
  );
}
