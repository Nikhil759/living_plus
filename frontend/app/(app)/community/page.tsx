import { CommunityBrowser } from "@/components/community/community-browser";
import { AppPage } from "@/components/layout/app-page";
import { liveBackendEnabled, loadCommunity, loadFeedPosts, loadResident } from "@/lib/data";

export default async function CommunityPage() {
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
      />
    </AppPage>
  );
}
