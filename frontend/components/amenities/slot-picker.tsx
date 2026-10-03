"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayRow } from "@/components/amenities/day-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { bookSlotApi, cancelBookingApi, fetchSlotsApi } from "@/lib/api/amenities-client";
import {
  formatDateLabel,
  formatSlotRange,
  formatSummaryDay,
  groupSlots,
  hasFreeSlot,
  nextDays,
} from "@/lib/amenities/view";
import { cn } from "@/lib/utils";
import type { AmenitySlot, AmenitySlots, SlotState } from "@/lib/types/amenities";

interface SlotPickerProps {
  amenityId: string;
  today: string;
  advanceDays: number;
  maxHoursPerDay: number;
}

interface Notice {
  tone: "error" | "success";
  text: string;
}

const CHIP_STYLE: Record<SlotState, string> = {
  free: "border border-hairline bg-card text-ink hover:border-primary hover:text-primary",
  yours: "border border-transparent bg-primary-tint text-primary",
  booked: "border border-transparent bg-quiet text-ink-tertiary",
  blocked: "border border-dashed border-hairline bg-quiet text-ink-tertiary",
  past: "",
};

function SlotsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[3, 3].map((count, group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: count }, (_, index) => (
              <Skeleton key={index} className="h-10 rounded-tile" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  const items = [
    ["Free", "border border-hairline bg-card"],
    ["Booked", "bg-quiet"],
    ["Yours", "bg-primary-tint"],
  ] as const;
  return (
    <ul className="flex items-center gap-4 text-caption text-ink-tertiary" aria-label="Legend">
      {items.map(([label, swatch]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded-[4px]", swatch)} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function SlotPicker({ amenityId, today, advanceDays, maxHoursPerDay }: SlotPickerProps) {
  const router = useRouter();
  const days = useMemo(() => nextDays(today, advanceDays), [today, advanceDays]);
  const [day, setDay] = useState(today);
  const [data, setData] = useState<AmenitySlots | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<AmenitySlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // undefined while searching, null when no later day has a free slot.
  const [nextFree, setNextFree] = useState<string | null | undefined>(undefined);
  const latest = useRef(0);

  const load = useCallback(
    async (target: string) => {
      const request = ++latest.current;
      setLoadFailed(false);
      try {
        const result = await fetchSlotsApi(amenityId, target);
        if (request === latest.current) setData(result);
      } catch {
        if (request === latest.current) setLoadFailed(true);
      }
    },
    [amenityId],
  );

  useEffect(() => {
    void load(day);
  }, [day, load]);

  const groups = useMemo(() => groupSlots(data?.slots ?? []), [data]);
  const ready = data?.date === day;
  const noneFree = ready && data ? !hasFreeSlot(data.slots) : false;

  // When a day has nothing free, look ahead for the next day that does.
  useEffect(() => {
    setNextFree(undefined);
    if (!noneFree) return;
    let cancelled = false;
    (async () => {
      for (const later of days.slice(days.indexOf(day) + 1)) {
        try {
          const result = await fetchSlotsApi(amenityId, later);
          if (hasFreeSlot(result.slots)) {
            if (!cancelled) setNextFree(later);
            return;
          }
        } catch {
          break;
        }
      }
      if (!cancelled) setNextFree(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [noneFree, day, days, amenityId]);

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
        setNotice({ tone: "success", text: "Booked. See you on court!" });
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
  const summary = selected
    ? `${formatSummaryDay(selected.startsAt)} · ${formatSlotRange(selected.startsAt, selected.endsAt)}`
    : "";
  const confirmLabel = cancelling ? "Cancel booking" : "Confirm booking";

  return (
    <section className="space-y-4 rounded-card bg-card p-5 shadow-card">
      <div>
        <h2 className="text-headline text-ink">Book a slot</h2>
        <p className="text-caption text-ink-secondary">
          Up to {maxHoursPerDay} hours a day, {advanceDays} days ahead.
        </p>
      </div>

      <DayRow days={days} today={today} selected={day} onSelect={chooseDay} layout="fit" />

      {!ready && !loadFailed ? (
        <SlotsSkeleton />
      ) : loadFailed ? (
        <div className="flex items-center justify-between gap-3 rounded-tile bg-quiet p-3">
          <p className="text-callout text-ink-secondary">Couldn&apos;t load slots.</p>
          <Button variant="secondary" size="sm" onClick={() => void load(day)}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {noneFree ? (
            <div className="rounded-tile bg-quiet p-3 text-callout text-ink-secondary">
              <p className="font-medium text-ink">No free slots this day</p>
              {nextFree ? (
                <button
                  type="button"
                  onClick={() => chooseDay(nextFree)}
                  className="mt-0.5 font-semibold text-primary"
                >
                  Next free: {formatDateLabel(nextFree)} →
                </button>
              ) : nextFree === null ? (
                <p className="mt-0.5 text-caption">Nothing free in the next few days either.</p>
              ) : null}
            </div>
          ) : null}
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-caption font-semibold text-ink-secondary">
                {group.label} <span className="font-normal text-ink-tertiary">· {group.range}</span>
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {group.slots.map((slot) => {
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
                          "flex min-h-10 w-full flex-col items-center justify-center rounded-tile px-1 py-1",
                          "text-callout transition-colors duration-premium ease-premium",
                          "disabled:cursor-not-allowed",
                          active ? "border border-transparent bg-primary text-white" : CHIP_STYLE[slot.state],
                        )}
                      >
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          {slot.state === "yours" && !active ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-label="Yours" />
                          ) : null}
                          {formatSlotRange(slot.startsAt, slot.endsAt)}
                        </span>
                        {slot.state === "blocked" ? (
                          <span className="max-w-full truncate text-[11px] leading-3">
                            {slot.label ?? "Blocked"}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Legend />

      {notice?.tone === "error" ? (
        <p role="alert" className="text-callout text-status-red">
          {notice.text}
        </p>
      ) : null}
      {notice?.tone === "success" ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-tile bg-primary-tint px-3 py-2.5 text-callout font-semibold text-primary"
        >
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          {notice.text}
        </p>
      ) : null}

      {selected ? (
        <div className="hidden space-y-3 border-t border-hairline pt-4 lg:block">
          <p className="text-callout font-semibold text-ink">{summary}</p>
          <Button
            variant={cancelling ? "secondary" : "primary"}
            className="w-full"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      ) : null}

      {selected ? (
        <>
          {/* Keeps the last slots clear of the fixed bar below the desktop breakpoint. */}
          <div className="h-16 lg:hidden" aria-hidden="true" />
          <div
            className="fixed inset-x-0 z-[55] border-t border-hairline bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden"
            style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto flex max-w-content items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-callout font-semibold text-ink">{summary}</p>
              <Button
                variant={cancelling ? "secondary" : "primary"}
                size="sm"
                disabled={busy}
                onClick={() => void confirm()}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
