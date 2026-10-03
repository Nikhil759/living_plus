import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { ListingCardSkeleton } from "@/components/marketplace/listing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaticResident } from "@/lib/data/static";

export default function Loading() {
  return (
    <>
      <TopBar title="Marketplace" resident={getStaticResident()} />
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-11 w-full rounded-full" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3 min-[1360px]:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
