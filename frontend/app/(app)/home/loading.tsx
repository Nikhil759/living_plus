import { PageContainer } from "@/components/layout/page-container";
import { HomeBannerFallback } from "@/components/home/home-photo-banner";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { getStaticResident } from "@/lib/data/static";

export default function HomeLoading() {
  const resident = getStaticResident();

  return (
    <>
      <HomeBannerFallback resident={resident} />
      <PageContainer className="pt-0">
        <div className="-mt-6 lg:-mt-10">
          <HomeSkeleton />
        </div>
      </PageContainer>
    </>
  );
}
