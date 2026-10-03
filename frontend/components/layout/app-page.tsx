import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { mockResident } from "@/lib/mock/home";

export interface AppPageProps {
  title: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

/** Standard shell for routes under `(app)/` — same top bar and padding as Home. */
export function AppPage({ title, children, backHref, backLabel }: AppPageProps) {
  return (
    <>
      <TopBar title={title} resident={mockResident} backHref={backHref} backLabel={backLabel} />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
