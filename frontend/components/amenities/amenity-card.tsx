import Link from "next/link";
import { AmenityImage } from "@/components/amenities/amenity-image";
import { buttonVariants } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import {
  amenityActionHref,
  amenityHref,
  amenityStatusLabel,
  amenityTone,
} from "@/lib/amenities/view";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/lib/types/home";

export function AmenityCard({ amenity }: { amenity: Amenity }) {
  const primary = amenity.action !== "view";
  return (
    <div
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-card bg-card shadow-card",
        "transition-[transform,box-shadow] duration-premium ease-premium",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <Link href={amenityHref(amenity.id)} className="block flex-1">
        <AmenityImage name={amenity.name} src={amenity.imageUrl} className="aspect-[16/10]" />
        <div className="space-y-1.5 px-5 pt-4">
          <h3 className="text-headline text-ink">{amenity.name}</h3>
          <p className="flex items-center gap-1.5 text-callout text-ink-secondary">
            <StatusDot tone={amenityTone(amenity.status)} />
            {amenityStatusLabel(amenity)}
          </p>
          <p className="text-caption text-ink-tertiary">{amenity.detail}</p>
        </div>
      </Link>
      <div className="p-5 pt-4">
        <Link
          href={amenityActionHref(amenity)}
          className={buttonVariants({
            variant: primary ? "primary" : "secondary",
            size: "sm",
            className: "w-full",
          })}
        >
          {amenity.actionLabel ?? "View"}
        </Link>
      </div>
    </div>
  );
}
