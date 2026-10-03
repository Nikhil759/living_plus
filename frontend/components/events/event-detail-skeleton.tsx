import { EventDetailTopBar } from "@/components/events/event-detail-top-bar";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EventDetailSkeleton() {
  return (
    <>
      <EventDetailTopBar />
      <PageContainer className="max-md:pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex w-full max-w-content flex-col">
          <Skeleton className="-mx-4 h-auto aspect-[16/10] rounded-none sm:-mx-5 md:mx-0 md:rounded-card lg:aspect-auto lg:h-[360px]" />
          <div className="mt-8 grid w-full items-start lg:grid-cols-[minmax(0,40rem)_22.5rem] lg:justify-between">
            <div className="space-y-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-10 w-3/4" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>
            <div className="mt-6 w-full lg:mt-0 lg:w-[22.5rem] lg:justify-self-end">
              <Card className="space-y-3 p-5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="hidden h-11 w-full rounded-full md:block" />
              </Card>
            </div>
            <div className="mt-8 space-y-8">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
