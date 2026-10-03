import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_LABEL, AVAILABILITY_TONE } from "@/lib/local-businesses/view";
import type { BusinessAvailability } from "@/lib/types/local-business";

/** Taking orders (green), Fully booked (amber) or On a break (grey). */
export function AvailabilityPill({
  availability,
  className,
}: {
  availability: BusinessAvailability;
  className?: string;
}) {
  return (
    <Badge dot={AVAILABILITY_TONE[availability]} className={className}>
      {AVAILABILITY_LABEL[availability]}
    </Badge>
  );
}
