import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <AppPage title={amenity.name} backHref="/amenities" backLabel="Amenities">
      <div className="max-w-3xl space-y-6">
        <AmenityImage
          name={amenity.name}
          src={amenity.imageUrl}
          className="aspect-[16/9] rounded-card md:aspect-[2/1]"
        />

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-headline text-ink">
            <StatusDot tone={amenityTone(amenity.status)} />
            {amenityStatusLabel(amenity)}
          </p>
          <p className="text-body text-ink-secondary">{amenity.detail}</p>
          <p className="text-caption text-ink-tertiary">{amenity.hoursLabel}</p>
        </div>

        {amenity.closureNote ? (
          <p role="status" className="rounded-card bg-quiet p-4 text-body text-ink">
            {amenity.closureNote}
          </p>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-title text-ink">Good to know</h2>
          <ul className="list-disc space-y-1 ps-5 text-body text-ink-secondary">
            {amenity.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        {amenity.kind === "bookable" ? (
          <SlotPicker
            amenityId={amenity.id}
            amenityName={amenity.name}
            today={today}
            advanceDays={amenity.advanceDays}
            maxHoursPerDay={amenity.maxHoursPerDay}
          />
        ) : null}
        {amenity.kind === "walk_in" ? <CrowdChart amenityId={amenity.id} today={today} /> : null}
        {amenity.kind === "space" ? (
          <Link
            href={amenityActionHref(amenity)}
            className={buttonVariants({ variant: "primary", size: "md", className: "w-full sm:w-auto" })}
          >
            {amenity.actionLabel ?? "Host an event here"}
          </Link>
        ) : null}

        {amenity.canManage ? <ClosureControl amenityId={amenity.id} closed={closed} /> : null}
      </div>
    </AppPage>
  );
}
