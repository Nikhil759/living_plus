import * as React from "react";
import { cn } from "@/lib/utils";

/** Horizontal inset for the main column — matches top bar padding. */
export const MAIN_GUTTER =
  "px-4 sm:px-5 lg:px-8 xl:px-10 xl:pr-12";

export function PageContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "flex w-full max-w-none flex-col gap-section pb-28 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]",
        "lg:pb-16 lg:pt-[calc(3rem+env(safe-area-inset-top,0px))]",
        MAIN_GUTTER,
        className,
      )}
      {...props}
    />
  );
}
