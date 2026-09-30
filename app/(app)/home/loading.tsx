import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { mockResident } from "@/lib/mock/home";

export default function HomeLoading() {
  // The top bar is static chrome, so it renders immediately while data loads.
  return (
    <>
      <TopBar title="Home" resident={mockResident} />
      <PageContainer>
        <HomeSkeleton />
      </PageContainer>
    </>
  );
}
