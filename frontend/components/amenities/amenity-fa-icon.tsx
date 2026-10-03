"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { amenityIcon } from "@/lib/amenities/icons";
import { cn } from "@/lib/utils";

export function AmenityFaIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={amenityIcon(name)}
      className={cn("h-[18px] w-[18px]", className)}
      aria-hidden="true"
    />
  );
}
