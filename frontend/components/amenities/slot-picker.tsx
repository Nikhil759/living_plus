"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DayRow } from "@/components/amenities/day-row";
import { SectionHeader } from "@/components/home/section-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { bookSlotApi, cancelBookingApi, fetchSlotsApi } from "@/lib/api/amenities-client";
import { formatBookingDay, formatSlotRange, nextDays } from "@/lib/amenities/view";
import { cn } from "@/lib/utils";
import type { AmenitySlot, AmenitySlots, SlotState } from "@/lib/types/amenities";

interface SlotPickerProps {
  amenityId: string;
  amenityName: string;
  today: string;
  advanceDays: number;
  maxHoursPerDay: number;
}

interface Notice {
  tone: "error" | "success";
  text: string;
}

const SLOT_STYLE: Record<SlotState, string> = {
  free: "bg-primary-tint text-primary",
  yours: "bg-card text-primary ring-2 ring-primary",
  booked: "bg-quiet text-ink-tertiary",
  blocked: "bg-quiet text-ink-tertiary",
  past: "bg-quiet text-ink-tertiary opacity-50",
};

function slotCaption(slot: AmenitySlot): string {
  if (slot.state === "free") return "Free";
  if (slot.state === "yours") return "Yours";
  if (slot.state === "booked") return "Booked";
  if (slot.state === "blocked") return slot.label ?? "Blocked";
  return "Past";
}

export function SlotPicker({
  amenityId,
  amenityName,
  today,
  advanceDays,
  maxHoursPerDay,
}: SlotPickerProps) {
  const router = useRouter();
  const [day, setDay] = useState(today);
  const [data, setData] = useState<AmenitySlots | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<AmenitySlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const latest = useRef(0);

  const load = useCallback(
    async (target: string) => {
      const request = ++latest.current;
      setLoading(true);
      setLoadFailed(false);
      try {
        const result = await fetchSlotsApi(amenityId, target);
        if (request === latest.current) setData(result);
      } catch {
        if (request === latest.current) setLoadFailed(true);
      } finally {
        if (request === latest.current) setLoading(false);
      }
    },
    [amenityId],
  );

  useEffect(() => {
    void load(day);
  }, [day, load]);

  function chooseDay(next: string) {
    setDay(next);
    setSelected(null);
    setNotice(null);
  }

  function pick(slot: AmenitySlot) {
    if (slot.state !== "free" && slot.state !== "yours") return;
    setNotice(null);
    setSelected(selected?.startsAt === slot.startsAt ? null : slot);
  }

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    try {
      if (selected.state === "yours" && selected.bookingId) {
        await cancelBookingApi(selected.bookingId);
        setNotice({ tone: "success", text: "Booking cancelled. The slot is free again." });
      } else {
        await bookSlotApi(amenityId, selected.startsAt);
        setNotice({ tone: "success", text: "Booked. You can find it under My bookings." });
      }
      router.refresh();
    } catch (error) {
      const text =
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      setNotice({ tone: "error", text });
    } finally {
      setSelected(null);
      setBusy(false);
      void load(day);
    }
  }

  const cancelling = selected?.state === "yours";

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Pick a slot"
        subtitle={`Up to ${maxHoursPerDay} hours a day, ${advanceDays} days ahead.`}
      />
      <DayRow
        days={nextDays(today, advanceDays)}
        today={today}
        selected={day}
        onSelect={chooseDay}
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-tile" />
          ))}
        </div>
      ) : loadFailed ? (
        <div className="flex items-center justify-between gap-3 rounded-card bg-quiet p-4">
          <p className="text-body text-ink-secondary">Couldn&apos;t load slots.</p>
          <Button variant="secondary" size="sm" onClick={() => void load(day)}>
            Try again
          </Button>
        </div>
      ) : (
        <ul
          className={cn(
            "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
            loading && "opacity-60",
          )}
        >
          {data?.slots.map((slot) => {
            const interactive = slot.state === "free" || slot.state === "yours";
            const active = selected?.startsAt === slot.startsAt;
            return (
              <li key={slot.startsAt}>
                <button
                  type="button"
                  disabled={!interactive}
                  aria-pressed={interactive ? active : undefined}
                  onClick={() => pick(slot)}
                  className={cn(
                    "flex h-14 w-full flex-col items-center justify-center rounded-tile px-2",
                    "transition-colors duration-premium ease-premium",
                    "disabled:cursor-not-allowed",
                    active ? "bg-primary text-white" : SLOT_STYLE[slot.state],
                  )}
                >
                  <span className="text-callout font-semibold">
                    {formatSlotRange(slot.startsAt, slot.endsAt)}
                  </span>
                  <span className="max-w-full truncate text-caption">{slotCaption(slot)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "text-callout",
            notice.tone === "error" ? "text-status-red" : "text-status-green",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      {selected ? (
        <div className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-ink">
            {cancelling ? "Cancel" : "Book"} {amenityName} ·{" "}
            {formatBookingDay(selected.startsAt)} · {formatSlotRange(selected.startsAt, selected.endsAt)}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setSelected(null)}>
              Back
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void confirm()}>
              {cancelling ? "Cancel booking" : "Confirm"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
