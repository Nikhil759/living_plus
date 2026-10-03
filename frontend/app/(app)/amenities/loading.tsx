import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaticResident } from "@/lib/data/static";

export default function Loading() {
  return (
    <>
      <TopBar title="Amenities" resident={getStaticResident()} />
      <PageContainer>
        <div className="space-y-5">
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-card bg-card shadow-card">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-3 h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
