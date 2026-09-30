import { PageContainer } from "@/components/layout/page-container";
import { TopBar } from "@/components/layout/top-bar";
import { AmenitiesSection } from "@/components/home/amenities-section";
import { AskAanganBar } from "@/components/home/ask-aangan-bar";
import { DigestCard } from "@/components/home/digest-card";
import { EventsSection } from "@/components/home/events-section";
import { HomeGreeting } from "@/components/home/home-greeting";
import { NeighbourMatchCard } from "@/components/home/neighbour-match-card";
import { getHomeData } from "@/lib/mock/home";

interface HomePageProps {
  // Next 15: searchParams is async.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // `/home?state=empty` previews the new-society empty state.
  const { state } = await searchParams;
  const { resident, digest, events, amenities, match, prompt } = await getHomeData({
    empty: state === "empty",
  });

  return (
    <>
      <TopBar title="Home" resident={resident} />

      <PageContainer>
        <HomeGreeting resident={resident} />

        {/*
          < xl: a single column in DOM order. The two wrappers are `display: contents`
          so the sticky Ask Aangan bar can float over the whole page on mobile.
          xl+:  main column + a 340px side rail that stays in view while scrolling.
        */}
        <div className="flex flex-col gap-6 lg:gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="contents xl:flex xl:flex-col xl:gap-8">
            {digest ? <DigestCard digest={digest} /> : null}
            <EventsSection events={events} />
            <AmenitiesSection amenities={amenities} />
          </div>

          <div className="contents xl:sticky xl:top-6 xl:flex xl:flex-col xl:gap-6">
            {match ? <NeighbourMatchCard match={match} /> : null}
            <AskAanganBar suggestion={prompt.suggestion} />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
