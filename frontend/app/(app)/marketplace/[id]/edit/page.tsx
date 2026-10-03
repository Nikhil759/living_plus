import { notFound, redirect } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { ListingForm } from "@/components/marketplace/listing-form";
import { fetchSellerProfile } from "@/lib/api/marketplace";
import { loadMarketplaceListingById, marketplaceIsLive } from "@/lib/data";

interface EditListingPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params;
  if (!marketplaceIsLive()) notFound();
  const listing = await loadMarketplaceListingById(id);
  if (!listing) notFound();
  // Only the seller edits; everyone else goes back to the item page.
  if (!listing.isMine) redirect(`/marketplace/${id}`);

  return (
    <AppPage title="Edit listing" backHref={`/marketplace/${id}`} backLabel="Listing">
      <ListingForm profile={await fetchSellerProfile()} listing={listing} />
    </AppPage>
  );
}
