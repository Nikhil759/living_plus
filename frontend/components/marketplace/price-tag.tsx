import { cn } from "@/lib/utils";

const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Bold price, or a "Free" tag for items given away. */
export function PriceTag({
  priceInr,
  isFree,
  className,
}: {
  priceInr: number;
  isFree: boolean;
  className?: string;
}) {
  if (isFree) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-primary-tint px-2.5 py-0.5 text-callout font-semibold text-primary",
          className,
        )}
      >
        Free
      </span>
    );
  }
  return <span className={cn("text-headline font-bold text-ink", className)}>{RUPEES.format(priceInr)}</span>;
}
