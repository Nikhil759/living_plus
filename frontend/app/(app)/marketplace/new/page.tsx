import { AppPage } from "@/components/layout/app-page";
import { ListingForm } from "@/components/marketplace/listing-form";
import { ErrorState } from "@/components/ui/error-state";
import { fetchSellerProfile } from "@/lib/api/marketplace";
import { marketplaceIsLive } from "@/lib/data";

export default async function SellItemPage() {
  return (
    <AppPage title="Sell an item" backHref="/marketplace" backLabel="Marketplace">
      {marketplaceIsLive() ? (
        <ListingForm profile={await fetchSellerProfile()} />
      ) : (
        <ErrorState message="Selling needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
      )}
    </AppPage>
  );
}
