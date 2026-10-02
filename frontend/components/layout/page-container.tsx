import * as React from "react";
import { cn } from "@/lib/utils";

export function PageContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-content flex-col gap-section px-6 pb-28 pt-16",
        "lg:px-10 lg:pb-16 lg:pt-14",
        className,
      )}
      {...props}
    />
  );
}
