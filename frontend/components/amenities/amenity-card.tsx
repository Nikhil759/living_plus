import Link from "next/link";
import { AmenityImage } from "@/components/amenities/amenity-image";
import { buttonVariants } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import {
  amenityActionHref,
  amenityCardActionLabel,
  amenityHref,
  amenityStatusLabel,
  amenityTone,
} from "@/lib/amenities/view";
import type { Amenity } from "@/lib/types/home";

export function AmenityCard({ amenity }: { amenity: Amenity }) {
  return (
    <div
      className={
        "group flex h-full flex-col overflow-hidden rounded-card bg-card shadow-card " +
        "transition-transform duration-premium ease-premium motion-safe:hover:-translate-y-1"
      }
    >
      <Link href={amenityHref(amenity.id)} className="block flex-1">
        <AmenityImage name={amenity.name} src={amenity.imageUrl} className="aspect-video" />
        <div className="space-y-0.5 px-4 pt-3">
          <h3 className="truncate text-headline text-ink">{amenity.name}</h3>
          <p className="flex min-w-0 items-center gap-1.5 text-caption text-ink-secondary">
            <StatusDot tone={amenityTone(amenity.status)} />
            <span className="shrink-0 font-medium text-ink">{amenityStatusLabel(amenity)}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{amenity.detail}</span>
          </p>
        </div>
      </Link>
      <div className="px-4 pb-3.5 pt-2.5">
        <Link
          href={amenityActionHref(amenity)}
          className={buttonVariants({
            variant: amenity.action === "book" ? "primary" : "secondary",
            size: "sm",
            className: "h-8 px-4",
          })}
        >
          {amenityCardActionLabel(amenity)}
        </Link>
      </div>
    </div>
  );
}
