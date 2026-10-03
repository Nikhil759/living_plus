"use client";

import { useEffect, useRef, useState } from "react";
import { DayRow } from "@/components/amenities/day-row";
import { SectionHeader } from "@/components/home/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCrowdApi } from "@/lib/api/amenities-client";
import { hourLabel, nextDays } from "@/lib/amenities/view";
import { cn } from "@/lib/utils";
import type { AmenityCrowd, CrowdLevel } from "@/lib/types/amenities";

const BAR_HEIGHT: Record<CrowdLevel, string> = {
  quiet: "h-1/3",
  moderate: "h-2/3",
  busy: "h-full",
};

const LABEL_EVERY = 3;

export function CrowdChart({ amenityId, today }: { amenityId: string; today: string }) {
  const [day, setDay] = useState(today);
  const [data, setData] = useState<AmenityCrowd | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const request = ++latest.current;
    setFailed(false);
    fetchCrowdApi(amenityId, day)
      .then((result) => request === latest.current && setData(result))
      .catch(() => request === latest.current && setFailed(true));
  }, [amenityId, day]);

  const first = data?.hours[0]?.hour ?? 0;

  return (
    <section className="space-y-4">
      <SectionHeader title="Usually busy" subtitle={data?.summary} />
      <DayRow days={nextDays(today, 7)} today={today} selected={day} onSelect={setDay} />
      {failed ? (
        <p className="text-body text-ink-secondary">Couldn&apos;t load the busy times.</p>
      ) : !data ? (
        <Skeleton className="h-36 w-full rounded-card" />
      ) : (
        <div className="rounded-card bg-card p-5 shadow-card">
          <ul className="flex h-28 items-end gap-1" aria-label="Usual crowd by hour">
            {data.hours.map(({ hour, level }) => (
              <li
                key={hour}
                className="flex h-full flex-1 items-end"
                aria-label={`${hourLabel(hour)}: ${level}${hour === data.currentHour ? ", now" : ""}`}
              >
                <span
                  className={cn(
                    "w-full rounded-t-sm",
                    BAR_HEIGHT[level],
                    hour === data.currentHour ? "bg-primary" : "bg-ink-tertiary/30",
                  )}
                />
              </li>
            ))}
          </ul>
          <ul className="mt-2 flex gap-1" aria-hidden="true">
            {data.hours.map(({ hour }) => (
              <li key={hour} className="flex-1 text-center text-caption text-ink-tertiary">
                {(hour - first) % LABEL_EVERY === 0 ? hourLabel(hour).replace(" ", "") : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
