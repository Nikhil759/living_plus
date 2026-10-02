import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaticResident } from "@/lib/data/static";

export function ScreenLoading({ title }: { title: string }) {
  return (
    <>
      <TopBar title={title} resident={getStaticResident()} />
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </PageContainer>
    </>
  );
}
