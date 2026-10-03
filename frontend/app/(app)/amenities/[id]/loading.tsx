import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaticResident } from "@/lib/data/static";

/** Mirrors the detail layout: banner, then details on the left and a booking card on the right. */
export default function Loading() {
  return (
    <>
      <TopBar title="Amenity" resident={getStaticResident()} backHref="/amenities" backLabel="Amenities" />
      <PageContainer>
        <div className="mx-auto w-full max-w-content">
          <Skeleton className="-mx-4 aspect-video rounded-none sm:-mx-5 lg:mx-0 lg:aspect-auto lg:h-[280px] lg:rounded-card" />
          <div className="mt-6 lg:mt-8 lg:flex lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1 space-y-6 lg:max-w-[640px]">
              <div className="space-y-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="mt-6 space-y-4 rounded-card bg-card p-5 shadow-card lg:mt-0 lg:w-[clamp(20rem,38%,23.75rem)] lg:shrink-0">
              <Skeleton className="h-5 w-28" />
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }, (_, index) => (
                  <Skeleton key={index} className="h-11 rounded-full" />
                ))}
              </div>
              {[0, 1].map((group) => (
                <div key={group} className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <Skeleton key={index} className="h-10 rounded-tile" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
