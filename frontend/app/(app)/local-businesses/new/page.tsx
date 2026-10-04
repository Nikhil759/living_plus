import { AppPage } from "@/components/layout/app-page";
import { BusinessForm } from "@/components/local-businesses/business-form";
import { ErrorState } from "@/components/ui/error-state";
import { fetchSellerProfile } from "@/lib/api/marketplace";
import { loadSaarthiDraft, marketplaceIsLive } from "@/lib/data";
import { businessPrefill } from "@/lib/saarthi/prefill";

interface ListBusinessPageProps {
  searchParams: Promise<{ saarthiAction?: string }>;
}

export default async function ListBusinessPage({ searchParams }: ListBusinessPageProps) {
  const draft = await loadSaarthiDraft((await searchParams).saarthiAction);
  return (
    <AppPage title="List your business" backHref="/local-businesses" backLabel="Local businesses">
      {marketplaceIsLive() ? (
        <BusinessForm
          profile={await fetchSellerProfile()}
          prefill={draft ? businessPrefill(draft) : undefined}
        />
      ) : (
        <ErrorState message="Listing a business needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
      )}
    </AppPage>
  );
}
