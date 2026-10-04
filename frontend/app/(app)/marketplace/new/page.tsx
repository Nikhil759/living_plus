import { AppPage } from "@/components/layout/app-page";
import { ListingForm } from "@/components/marketplace/listing-form";
import { ErrorState } from "@/components/ui/error-state";
import { fetchSellerProfile } from "@/lib/api/marketplace";
import { loadSaarthiDraft, marketplaceIsLive } from "@/lib/data";
import { listingPrefill } from "@/lib/saarthi/prefill";

interface SellItemPageProps {
  searchParams: Promise<{ saarthiAction?: string }>;
}

export default async function SellItemPage({ searchParams }: SellItemPageProps) {
  const draft = await loadSaarthiDraft((await searchParams).saarthiAction);
  return (
    <AppPage title="Sell an item" backHref="/marketplace" backLabel="Marketplace">
      {marketplaceIsLive() ? (
        <ListingForm
          profile={await fetchSellerProfile()}
          prefill={draft ? listingPrefill(draft) : undefined}
        />
      ) : (
        <ErrorState message="Selling needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
      )}
    </AppPage>
  );
}
