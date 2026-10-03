import { AppPage } from "@/components/layout/app-page";
import { BusinessForm } from "@/components/local-businesses/business-form";
import { ErrorState } from "@/components/ui/error-state";
import { fetchSellerProfile } from "@/lib/api/marketplace";
import { marketplaceIsLive } from "@/lib/data";

export default async function ListBusinessPage() {
  return (
    <AppPage title="List your business" backHref="/local-businesses" backLabel="Local businesses">
      {marketplaceIsLive() ? (
        <BusinessForm profile={await fetchSellerProfile()} />
      ) : (
        <ErrorState message="Listing a business needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
      )}
    </AppPage>
  );
}
