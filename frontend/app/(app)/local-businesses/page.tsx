import Link from "next/link";
import { AppPage } from "@/components/layout/app-page";
import { fetchCurrentResident } from "@/lib/api/home";
import { BusinessBrowse } from "@/components/local-businesses/business-browse";
import { MyBusinesses } from "@/components/local-businesses/my-businesses";
import { PendingBusinesses } from "@/components/local-businesses/pending-businesses";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { marketplaceIsLive } from "@/lib/data";

export default async function LocalBusinessesPage() {
  const live = marketplaceIsLive();
  // Same role check the Events screens use.
  const isCommittee = live && /committee|admin/i.test((await fetchCurrentResident()).roles.join(" "));
  return (
    <AppPage title="Local businesses">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-body text-ink-secondary">Run by your neighbours</p>
          <Link href="/local-businesses/new" className={buttonVariants({ size: "sm" })}>
            List your business
          </Link>
        </div>
        {!live ? (
          <ErrorState message="Local businesses need the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
        ) : (
          <>
            {isCommittee ? <PendingBusinesses /> : null}
            <MyBusinesses />
            <BusinessBrowse />
          </>
        )}
      </div>
    </AppPage>
  );
}
