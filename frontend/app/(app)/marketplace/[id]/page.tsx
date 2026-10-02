import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Package, User } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPriceInr } from "@/lib/format";
import { loadMarketplaceListingById } from "@/lib/data";
import {
  LISTING_CATEGORY_LABEL,
  LISTING_CONDITION_LABEL,
  listingContactHref,
} from "@/lib/marketplace-labels";

interface MarketplaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketplaceDetailPage({ params }: MarketplaceDetailPageProps) {
  const { id } = await params;
  const listing = await loadMarketplaceListingById(id);
  if (!listing) notFound();

  const canContact = listing.status === "active";
  const contactLabel =
    listing.contact.type === "whatsapp" ? "Message on WhatsApp" : "Call seller";
  const contactMessage = `Hi, I'm interested in your listing "${listing.title}" on Living+ Marketplace.`;

  return (
    <AppPage title="Listing">
      <Link href="/marketplace" className="text-callout font-semibold text-primary">
        All listings
      </Link>
      <Card className="mt-4 overflow-hidden p-0">
        <div className="relative aspect-video bg-quiet">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt={listing.imageAlt ?? listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center text-ink-tertiary">
              <Package className="h-16 w-16" strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-title text-ink">{listing.title}</h1>
            <p className="text-title text-primary">{formatPriceInr(listing.priceInr)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{LISTING_CATEGORY_LABEL[listing.category]}</Badge>
            <Badge>{LISTING_CONDITION_LABEL[listing.condition]}</Badge>
            {listing.status !== "active" ? (
              <Badge>{listing.status === "sold" ? "Sold" : "Reserved"}</Badge>
            ) : null}
          </div>
          <p className="text-body text-ink-secondary">{listing.description}</p>
          <ul className="space-y-2 text-body text-ink-secondary">
            <li className="flex items-center gap-2">
              <User className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
              {listing.sellerLabel}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
              Pickup in society — coordinate with seller
            </li>
          </ul>
          {canContact ? (
            <a
              href={listingContactHref(listing.contact, contactMessage)}
              className={buttonVariants({ variant: "primary" })}
              target={listing.contact.type === "whatsapp" ? "_blank" : undefined}
              rel={listing.contact.type === "whatsapp" ? "noopener noreferrer" : undefined}
            >
              {contactLabel}
            </a>
          ) : (
            <button type="button" className={buttonVariants({ variant: "primary" })} disabled>
              No longer available
            </button>
          )}
        </div>
      </Card>
    </AppPage>
  );
}
