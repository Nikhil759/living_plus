import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { PriceTag } from "@/components/marketplace/price-tag";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadMarketplaceListingById } from "@/lib/data";
import { LISTING_CATEGORY_LABEL, LISTING_CONDITION_LABEL } from "@/lib/marketplace/view";

interface MarketplaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketplaceDetailPage({ params }: MarketplaceDetailPageProps) {
  const { id } = await params;
  const listing = await loadMarketplaceListingById(id);
  if (!listing) notFound();

  return (
    <AppPage title="Listing">
      <Link href="/marketplace" className="text-callout font-semibold text-primary">
        All listings
      </Link>
      <Card className="mt-4 overflow-hidden p-0">
        <ListingPhoto
          title={listing.title}
          category={listing.category}
          src={listing.coverUrl}
          className="aspect-square w-full max-w-xl"
        />
        <div className="space-y-3 p-5">
          <PriceTag priceInr={listing.priceInr} isFree={listing.isFree} />
          <h1 className="text-title text-ink">{listing.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge>{LISTING_CATEGORY_LABEL[listing.category]}</Badge>
            <Badge>{LISTING_CONDITION_LABEL[listing.condition]}</Badge>
          </div>
          {listing.description ? <p className="text-body text-ink-secondary">{listing.description}</p> : null}
        </div>
      </Card>
    </AppPage>
  );
}
