import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { mockResident } from "@/lib/mock/home";

export interface AppPageProps {
  title: string;
  children: React.ReactNode;
}

/** Standard shell for routes under `(app)/` — same top bar and padding as Home. */
export function AppPage({ title, children }: AppPageProps) {
  return (
    <>
      <TopBar title={title} resident={mockResident} />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
