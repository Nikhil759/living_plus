import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Icon-only control — same secondary pill as `Button` (soft sky fill + primary icon). */
export function headerIconButtonClass(className?: string) {
  return buttonVariants({
    variant: "secondary",
    className: cn("h-10 w-10 p-0", className),
  });
}
