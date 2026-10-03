"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionHeader } from "@/components/home/section-header";
import { buttonVariants } from "@/components/ui/button";
import { cancelBookingApi } from "@/lib/api/amenities-client";
import { formatBookingDay, formatSlotRange } from "@/lib/amenities/view";
import { cn } from "@/lib/utils";
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
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex w-[17rem] shrink-0 snap-start items-center justify-between gap-3 rounded-tile bg-card px-4 py-3 shadow-card"
          >
            <div className="min-w-0">
              <p className="truncate text-callout font-semibold text-ink">{item.amenityName}</p>
              <p className="truncate text-caption text-ink-secondary">
                {formatBookingDay(item.startsAt)} · {formatSlotRange(item.startsAt, item.endsAt)}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => void cancel(item.id)}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm", className: "h-8 px-3" }),
                "text-caption",
              )}
            >
              Cancel
            </button>
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
