import Link from "next/link";
import { Store } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalBusinessFeedCard } from "@/components/home/local-business-feed-card";
import { SectionHeader } from "@/components/home/section-header";
import { homePicks } from "@/lib/local-businesses/view";
import type { BusinessCard } from "@/lib/types/local-business";

const HOME_FEED_LIMIT = 4;

export interface LocalBusinessesSectionProps {
  businesses: BusinessCard[];
}

export function LocalBusinessesSection({ businesses }: LocalBusinessesSectionProps) {
  // Up to four featured businesses come first.
  const picks = homePicks(businesses, HOME_FEED_LIMIT);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Local businesses"
        subtitle="Run by your neighbours"
        action={picks.length > 0 ? { label: "See all", href: "/local-businesses" } : undefined}
      />

      {picks.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="No businesses yet. Be the first to list yours."
          action={
            <Link href="/local-businesses/new" className="text-callout font-semibold text-primary">
              List your business
            </Link>
          }
        />
      ) : (
        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
          {picks.map((business) => (
            <LocalBusinessFeedCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </section>
  );
}
