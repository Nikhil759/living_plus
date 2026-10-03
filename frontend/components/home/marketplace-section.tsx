import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingFeedCard } from "@/components/home/listing-feed-card";
import { SectionHeader } from "@/components/home/section-header";
import type { MarketplaceCard } from "@/lib/types/marketplace";

const HOME_FEED_LIMIT = 4;

export interface MarketplaceSectionProps {
  listings: MarketplaceCard[];
}

export function MarketplaceSection({ listings }: MarketplaceSectionProps) {
  const active = listings.filter((item) => item.status === "available").slice(0, HOME_FEED_LIMIT);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Marketplace"
        subtitle="Buy and sell with neighbours"
        action={active.length > 0 ? { label: "See all", href: "/marketplace" } : undefined}
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Nothing here yet. Be the first to list something."
          action={
            <Link href="/marketplace/new" className="text-callout font-semibold text-primary">
              Sell an item
            </Link>
          }
        />
      ) : (
        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
          {active.map((listing) => (
            <ListingFeedCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}
