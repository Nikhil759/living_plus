import { CommunityBrowser, type CommunityTab } from "@/components/community/community-browser";
import { AppPage } from "@/components/layout/app-page";
import { liveBackendEnabled, loadCommunity, loadFeedPosts, loadResident } from "@/lib/data";

const TABS: CommunityTab[] = ["feed", "groups", "whatsapp", "people"];

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [catalog, feedPosts, resident] = await Promise.all([
    loadCommunity(),
    loadFeedPosts(),
    loadResident(),
  ]);

  return (
    <AppPage title="Community">
      <CommunityBrowser
        catalog={catalog}
        feedPosts={feedPosts}
        resident={resident}
        writeEnabled={liveBackendEnabled()}
        initialTab={TABS.find((t) => t === tab) ?? "feed"}
      />
    </AppPage>
  );
}
