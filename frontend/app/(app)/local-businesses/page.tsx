import Link from "next/link";
import { AppPage } from "@/components/layout/app-page";
import { BusinessBrowse } from "@/components/local-businesses/business-browse";
import { MyBusinesses } from "@/components/local-businesses/my-businesses";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { marketplaceIsLive } from "@/lib/data";

export default function LocalBusinessesPage() {
  return (
    <AppPage title="Local businesses">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-body text-ink-secondary">Run by your neighbours</p>
          <Link href="/local-businesses/new" className={buttonVariants({ size: "sm" })}>
            List your business
          </Link>
        </div>
        {!marketplaceIsLive() ? (
          <ErrorState message="Local businesses need the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
        ) : (
          <>
            <MyBusinesses />
            <BusinessBrowse />
          </>
        )}
      </div>
    </AppPage>
  );
}
