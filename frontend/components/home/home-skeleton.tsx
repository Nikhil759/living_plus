import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading home" className="flex flex-col gap-section">
      <div className="space-y-3">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-11 w-80 max-w-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-card" />
      <div className="flex gap-4 overflow-hidden">
        <Skeleton className="h-64 w-72 shrink-0 rounded-card" />
        <Skeleton className="h-64 w-72 shrink-0 rounded-card" />
      </div>
    </div>
  );
}
