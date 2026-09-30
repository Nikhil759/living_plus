import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared <main> padding. Mobile clears the fixed top bar and bottom nav;
 * desktop sits below the in-flow header with roomier gutters.
 */
export function PageContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "flex flex-col gap-6 px-margin pb-28 pt-[calc(4rem+env(safe-area-inset-top,0px)+0.25rem)]",
        "lg:gap-8 lg:px-10 lg:pb-12 lg:pt-2",
        className,
      )}
      {...props}
    />
  );
}
