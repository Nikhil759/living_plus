import { PageContainer } from "@/components/layout/page-container";
import { AmenitiesSection } from "@/components/home/amenities-section";
import { DigestCard } from "@/components/home/digest-card";
import { EventsSection } from "@/components/home/events-section";
import { FeedPostItem } from "@/components/home/feed-post-item";
import { FlatOpeningsSection } from "@/components/home/flat-openings-section";
import { HelpDeskSection } from "@/components/home/help-desk-section";
import { HomePhotoBanner } from "@/components/home/home-photo-banner";
import type { BusinessCard } from "@/lib/types/local-business";
import { LocalBusinessesSection } from "@/components/home/local-businesses-section";
import { MarketplaceSection } from "@/components/home/marketplace-section";
import { NeighbourMatchCard } from "@/components/home/neighbour-match-card";
import { RentSummaryCard } from "@/components/home/rent-summary-card";
import { SectionHeader } from "@/components/home/section-header";
import { ErrorState } from "@/components/ui/error-state";
import {
  getDataSource,
  loadFlatOpenings,
  loadHelpDeskTickets,
  loadHelpDeskVendors,
  loadHomeData,
  loadLocalBusinesses,
  loadMarketplaceListings,
  loadRentDashboard,
} from "@/lib/data";
import {
  getStaticFlatOpenings,
  getStaticHelpDeskTickets,
  getStaticHelpDeskVendors,
  getStaticHomeData,
  getStaticMarketplaceListings,
  getStaticRentDashboard,
} from "@/lib/data/static";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { state } = await searchParams;
  const empty = state === "empty";

  let loadError: string | null = null;
  let data;
  let listings;
  let businesses: BusinessCard[];
  let openings;
  let tickets;
  let vendors;
  let rent;
  try {
    [data, listings, businesses, openings, tickets, vendors, rent] = await Promise.all([
      loadHomeData({ empty }),
      loadMarketplaceListings(),
      loadLocalBusinesses(),
      loadFlatOpenings(),
      loadHelpDeskTickets(),
      loadHelpDeskVendors(),
      loadRentDashboard(),
    ]);
  } catch {
    loadError =
      getDataSource() === "api"
        ? "Could not reach the API. Check that the backend is running."
        : "Could not load home data.";
    data = getStaticHomeData({ empty });
    listings = getStaticMarketplaceListings();
    businesses = [];
    openings = getStaticFlatOpenings();
    tickets = getStaticHelpDeskTickets();
    vendors = getStaticHelpDeskVendors();
    rent = getStaticRentDashboard();
  }

  const { resident, digest, events, amenities, match } = data;
  const posts = digest?.posts ?? [];

  return (
    <>
      <HomePhotoBanner resident={resident} />

      <PageContainer className="gap-section pt-0">
        {loadError ? <ErrorState message={loadError} /> : null}

        <div className="flex flex-col gap-section xl:grid xl:grid-cols-[minmax(0,1fr)_min(100%,22rem)] xl:items-start xl:gap-10">
          <div className="relative z-10 flex flex-col gap-section">
            {digest ? (
              <div className="-mt-6 lg:-mt-10">
                <DigestCard digest={digest} />
              </div>
            ) : null}
            <EventsSection events={events} />
            <AmenitiesSection amenities={amenities} />
            <div className="xl:hidden">
              <RentSummaryCard current={rent.current} recurring={rent.recurring} />
            </div>
            {posts.length > 0 ? (
              <section className="space-y-5">
                <SectionHeader title="From your neighbours" action={{ label: "See all", href: "/community" }} />
                <div className="space-y-6">
                  {posts.map((post) => (
                    <FeedPostItem key={post.id} post={post} />
                  ))}
                </div>
              </section>
            ) : null}
            <MarketplaceSection listings={listings} />
            <LocalBusinessesSection businesses={businesses} />
            <FlatOpeningsSection openings={openings} />
            <HelpDeskSection vendors={vendors} tickets={tickets} />
          </div>

          <div className="flex flex-col gap-5 xl:sticky xl:top-[calc(3.5rem+env(safe-area-inset-top,0px))]">
            <div className="hidden xl:block">
              <RentSummaryCard current={rent.current} recurring={rent.recurring} />
            </div>
            {match ? <NeighbourMatchCard match={match} /> : null}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
