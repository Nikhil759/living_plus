import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { CommitteeRemove } from "@/components/marketplace/committee-remove";
import { ContactSellerButton } from "@/components/marketplace/contact-seller-button";
import { ListingGallery } from "@/components/marketplace/listing-gallery";
import { OwnerActions } from "@/components/marketplace/owner-actions";
import { PriceTag } from "@/components/marketplace/price-tag";
import { ReportListing } from "@/components/marketplace/report-listing";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadMarketplaceListingById, marketplaceIsLive } from "@/lib/data";
import {
  LISTING_CATEGORY_LABEL,
  LISTING_CONDITION_LABEL,
  listedAgo,
} from "@/lib/marketplace/view";

interface MarketplaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketplaceDetailPage({ params }: MarketplaceDetailPageProps) {
  const { id } = await params;
  const listing = await loadMarketplaceListingById(id);
  if (!listing) notFound();

  const live = marketplaceIsLive();
  const sold = listing.status === "sold";
  const canContact = live && !listing.isMine && !sold;
  const committeeView = listing.canManage && !listing.isMine;

  return (
    <AppPage title="Listing" backHref="/marketplace" backLabel="Marketplace">
      <div className="mx-auto w-full max-w-content">
        <div className="lg:flex lg:items-start lg:justify-center lg:gap-10">
          <ListingGallery
            title={listing.title}
            category={listing.category}
            photos={listing.photos}
            status={listing.status}
            className="-mx-4 min-w-0 sm:-mx-5 lg:mx-0 lg:max-w-[560px] lg:flex-1"
          />

          <aside className="mt-6 space-y-4 lg:sticky lg:top-24 lg:mt-0 lg:w-[340px] lg:shrink-0 xl:w-[400px]">
            <Card className="space-y-4 p-5 sm:p-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <PriceTag priceInr={listing.priceInr} isFree={listing.isFree} className="!text-[28px] !leading-9" />
                  {listing.negotiable ? <Badge>Negotiable</Badge> : null}
                  {listing.status === "reserved" ? <Badge dot="amber">Reserved</Badge> : null}
                  {sold ? <Badge dot="quiet">Sold</Badge> : null}
                  {listing.reported ? <Badge dot="red">Reported</Badge> : null}
                </div>
                <h1 className="text-title text-ink">{listing.title}</h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{LISTING_CATEGORY_LABEL[listing.category]}</Badge>
                <Badge>{LISTING_CONDITION_LABEL[listing.condition]}</Badge>
              </div>

              {listing.description ? (
                <p className="whitespace-pre-line text-body text-ink-secondary">{listing.description}</p>
              ) : null}

              <div className="flex items-center gap-3 border-t border-hairline pt-4">
                <Avatar name={listing.seller.firstName} src={listing.seller.avatarUrl ?? undefined} size="md" />
                <div className="min-w-0">
                  <p className="text-headline text-ink">{listing.seller.firstName}</p>
                  {listing.seller.tower ? (
                    <p className="text-callout text-ink-secondary">{listing.seller.tower}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5 text-callout text-ink-secondary">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {listing.pickupNote}
                </p>
                <p className="pl-6 text-caption text-ink-tertiary">Listed {listedAgo(listing.listedAt)}</p>
              </div>

              {live && listing.isMine ? <OwnerActions listingId={listing.id} status={listing.status} /> : null}
              {canContact ? (
                <>
                  <ContactSellerButton
                    listingId={listing.id}
                    method={listing.contactMethod}
                    className="hidden lg:block"
                  />
                  <ReportListing listingId={listing.id} />
                </>
              ) : null}
            </Card>
            {live && committeeView ? <CommitteeRemove listingId={listing.id} /> : null}
          </aside>
        </div>
      </div>

      {canContact ? (
        <div
          className="fixed inset-x-0 z-[55] border-t border-hairline bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex max-w-content items-center gap-3">
            <PriceTag priceInr={listing.priceInr} isFree={listing.isFree} className="shrink-0" />
            <ContactSellerButton
              listingId={listing.id}
              method={listing.contactMethod}
              hint={false}
              className="min-w-0 flex-1"
            />
          </div>
        </div>
      ) : null}
    </AppPage>
  );
}
