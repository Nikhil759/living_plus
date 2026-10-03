import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { AmenityImage } from "@/components/amenities/amenity-image";
import { ClosureControl } from "@/components/amenities/closure-control";
import { CrowdChart } from "@/components/amenities/crowd-chart";
import { SlotPicker } from "@/components/amenities/slot-picker";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { fetchAmenity } from "@/lib/api/amenities";
import {
  amenityActionHref,
  amenityStatusLabel,
  amenityTone,
  istToday,
} from "@/lib/amenities/view";

interface AmenityPageProps {
  params: Promise<{ id: string }>;
}

export default async function AmenityPage({ params }: AmenityPageProps) {
  const { id } = await params;
  const amenity = await fetchAmenity(id);
  if (!amenity) notFound();

  const today = istToday();
  const closed = Boolean(amenity.closureNote);
  const hasSide = amenity.kind === "bookable" || amenity.kind === "space";

  return (
    <AppPage title={amenity.name} backHref="/amenities" backLabel="Amenities">
      <div className="mx-auto w-full max-w-content">
        {/* Edge to edge on small screens, a 280px banner on desktop. */}
        <AmenityImage
          name={amenity.name}
          src={amenity.imageUrl}
          className="-mx-4 aspect-video sm:-mx-5 lg:mx-0 lg:aspect-auto lg:h-[280px] lg:rounded-card"
        />

        <div className="mt-6 lg:mt-8 lg:flex lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1 space-y-6 lg:max-w-[640px]">
            <div className="space-y-2">
              <h1 className="text-[28px] font-semibold leading-8 tracking-tight text-ink">
                {amenity.name}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-callout text-ink-secondary">
                <StatusDot tone={amenityTone(amenity.status)} />
                <span className="font-semibold text-ink">{amenityStatusLabel(amenity)}</span>
                <span aria-hidden="true">·</span>
                <span>{amenity.detail}</span>
                <span aria-hidden="true">·</span>
                <span>{amenity.hoursLabel}</span>
              </p>
            </div>

            {amenity.closureNote ? (
              <p role="status" className="rounded-tile bg-quiet p-4 text-body text-ink">
                {amenity.closureNote}
              </p>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-headline text-ink">Good to know</h2>
              <ul className="space-y-2">
                {amenity.rules.slice(0, 4).map((rule) => (
                  <li key={rule} className="flex gap-2.5 text-body text-ink-secondary">
                    <span
                      className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-tertiary"
                      aria-hidden="true"
                    />
                    {rule}
                  </li>
                ))}
              </ul>
            </section>

            {amenity.kind === "walk_in" ? (
              <CrowdChart amenityId={amenity.id} today={today} />
            ) : null}

            {amenity.canManage ? <ClosureControl amenityId={amenity.id} closed={closed} /> : null}
          </div>

          {hasSide ? (
            <aside className="mt-6 lg:sticky lg:top-20 lg:mt-0 lg:w-[clamp(20rem,38%,23.75rem)] lg:shrink-0">
              {amenity.kind === "bookable" ? (
                <SlotPicker
                  amenityId={amenity.id}
                  today={today}
                  advanceDays={amenity.advanceDays}
                  maxHoursPerDay={amenity.maxHoursPerDay}
                />
              ) : (
                <section className="space-y-4 rounded-card bg-card p-5 shadow-card">
                  <h2 className="text-headline text-ink">Host here</h2>
                  <p className="flex items-center gap-2 text-callout text-ink-secondary">
                    <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    Capacity {amenity.capacity}
                  </p>
                  <Link
                    href={amenityActionHref(amenity)}
                    className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}
                  >
                    {amenity.actionLabel ?? "Host an event here"}
                  </Link>
                </section>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </AppPage>
  );
}
