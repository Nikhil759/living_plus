import Link from "next/link";
import { Home } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { OpeningFeedCard } from "@/components/home/opening-feed-card";
import { SectionHeader } from "@/components/home/section-header";
import type { FlatOpening } from "@/lib/types/flat-opening";

const HOME_FEED_LIMIT = 4;

export interface FlatOpeningsSectionProps {
  openings: FlatOpening[];
}

export function FlatOpeningsSection({ openings }: FlatOpeningsSectionProps) {
  const active = openings.filter((o) => o.status === "active").slice(0, HOME_FEED_LIMIT);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Flat openings"
        subtitle="Rooms, flatmates and full flats in society"
        action={active.length > 0 ? { label: "See all", href: "/flat-openings" } : undefined}
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<Home />}
          title="No openings listed"
          action={
            <Link href="/flat-openings/new" className="text-callout font-semibold text-primary">
              Post opening
            </Link>
          }
        />
      ) : (
        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
          {active.map((opening) => (
            <OpeningFeedCard key={opening.id} opening={opening} />
          ))}
        </div>
      )}
    </section>
  );
}
