import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { ListingCard } from "@/components/marketplace/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { loadMarketplaceListings } from "@/lib/data";

export default async function MarketplacePage() {
  const listings = (await loadMarketplaceListings()).filter((item) => item.status !== "sold");

  return (
    <AppPage title="Marketplace">
      <div className="flex items-end justify-between gap-4">
        <p className="text-body text-ink-secondary">
          Second-hand from neighbours. Contact sellers directly — no in-app payments yet.
        </p>
        <Link href="/marketplace/new" className="text-callout font-semibold text-primary">
          Sell
        </Link>
      </div>
      {listings.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No listings yet"
          action={
            <Link href="/marketplace/new" className="text-callout font-semibold text-primary">
              List an item
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </AppPage>
  );
}
