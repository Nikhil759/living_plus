import {
  EVENT_DETAIL_ASIDE,
  EVENT_DETAIL_BODY,
  EVENT_DETAIL_GRID,
  EVENT_DETAIL_HEADER,
  EVENT_DETAIL_PAGE_PADDING,
} from "@/components/events/event-detail-layout";
import { EventDetailTopBar } from "@/components/events/event-detail-top-bar";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EventDetailSkeleton() {
  return (
    <>
      <EventDetailTopBar />
      <PageContainer className={EVENT_DETAIL_PAGE_PADDING}>
        <div className="mx-auto flex w-full max-w-content flex-col">
          <Skeleton className="-mx-4 h-auto aspect-[16/10] rounded-none sm:-mx-5 md:mx-0 md:aspect-auto md:h-[360px] md:rounded-card" />
          <div className={cn("mt-8", EVENT_DETAIL_GRID)}>
            <div className={EVENT_DETAIL_HEADER}>
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
            <div className={EVENT_DETAIL_ASIDE}>
              <Card className="space-y-3 p-5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="hidden h-11 w-full rounded-full md:block" />
              </Card>
            </div>
            <div className={EVENT_DETAIL_BODY}>
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
