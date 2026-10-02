import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { AmenitiesSection } from "@/components/home/amenities-section";
import { DigestCard } from "@/components/home/digest-card";
import { EventsSection } from "@/components/home/events-section";
import { FeedPostItem } from "@/components/home/feed-post-item";
import { FlatOpeningsSection } from "@/components/home/flat-openings-section";
import { HelpDeskSection } from "@/components/home/help-desk-section";
import { HomeGreeting } from "@/components/home/home-greeting";
import { LocalBusinessesSection } from "@/components/home/local-businesses-section";
import { MarketplaceSection } from "@/components/home/marketplace-section";
import { NeighbourMatchCard } from "@/components/home/neighbour-match-card";
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
} from "@/lib/data";
import { getStaticHomeData } from "@/lib/data/static";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { state } = await searchParams;
  const empty = state === "empty";

  let loadError: string | null = null;
  let data;
  try {
    data = await loadHomeData({ empty });
  } catch {
    loadError =
      getDataSource() === "api"
        ? "Could not reach the API. Check that the backend is running."
        : "Could not load home data.";
    data = getStaticHomeData({ empty: true });
  }

  const [listings, businesses, openings, tickets, vendors] = await Promise.all([
    loadMarketplaceListings(),
    loadLocalBusinesses(),
    loadFlatOpenings(),
    loadHelpDeskTickets(),
    loadHelpDeskVendors(),
  ]);

  const { resident, digest, events, amenities, match } = data;
  const posts = digest?.posts ?? [];

  return (
    <>
      <TopBar title="Home" resident={resident} />

      <PageContainer>
        {loadError ? <ErrorState message={loadError} /> : null}

        <HomeGreeting resident={resident} />

        <div className="flex flex-col gap-section xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="flex flex-col gap-section">
            {digest ? <DigestCard digest={digest} /> : null}
            <EventsSection events={events} />
            <AmenitiesSection amenities={amenities} />
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

          <div className="xl:sticky xl:top-16">
            {match ? <NeighbourMatchCard match={match} /> : null}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
