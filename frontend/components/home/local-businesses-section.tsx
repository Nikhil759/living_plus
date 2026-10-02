import Link from "next/link";
import { Store } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalBusinessFeedCard } from "@/components/home/local-business-feed-card";
import { SectionHeader } from "@/components/home/section-header";
import type { LocalBusiness } from "@/lib/types/local-business";

const HOME_FEED_LIMIT = 4;

export interface LocalBusinessesSectionProps {
  businesses: LocalBusiness[];
}

export function LocalBusinessesSection({ businesses }: LocalBusinessesSectionProps) {
  const picks = businesses.slice(0, HOME_FEED_LIMIT);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Local businesses"
        subtitle="Tiffin, services and shops nearby"
        action={picks.length > 0 ? { label: "Directory", href: "/local-businesses" } : undefined}
      />

      {picks.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="Directory coming soon"
          action={
            <Link href="/local-businesses" className="text-callout font-semibold text-primary">
              Browse directory
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
