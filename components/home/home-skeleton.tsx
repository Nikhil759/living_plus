import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function EventCardSkeleton() {
  return (
    <Card className="w-[270px] shrink-0 overflow-hidden lg:w-auto">
      <Skeleton className="h-36 w-full rounded-none lg:h-40" />
      <div className="space-y-3 p-3.5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44 max-w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Mirrors the real Home layout at every breakpoint (same grid, same wrappers)
 * so nothing jumps when data arrives.
 */
export function HomeSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading home"
      className="flex flex-col gap-6 lg:gap-8"
    >
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 lg:h-9 lg:w-80" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="flex flex-col gap-6 lg:gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        {/* Main column */}
        <div className="contents xl:flex xl:flex-col xl:gap-8">
          <Card className="space-y-3 p-4 lg:p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </Card>

          <div className="space-y-3 lg:space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="-mx-margin flex gap-3.5 overflow-hidden px-margin lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:px-0">
              {/* 4 cards = 2x2 on desktop (matches the loaded grid); extras clip on mobile. */}
              {[0, 1, 2, 3].map((i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <div className="flex flex-wrap gap-2">
              {["w-40", "w-44", "w-48", "w-36", "w-32"].map((w, i) => (
                <Skeleton key={i} className={`h-9 rounded-full ${w}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Side rail (below the main column until xl) */}
        <div className="contents xl:flex xl:flex-col xl:gap-6">
          <Card className="space-y-3 p-4 lg:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center justify-between pt-1 xl:flex-col xl:items-stretch xl:gap-3">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-9 w-32 rounded-full xl:w-full" />
            </div>
          </Card>
          <Skeleton className="hidden h-[52px] w-full rounded-full lg:block" />
        </div>
      </div>
    </div>
  );
}
