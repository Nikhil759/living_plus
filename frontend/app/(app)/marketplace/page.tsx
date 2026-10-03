import Link from "next/link";
import { AppPage } from "@/components/layout/app-page";
import { MarketplaceBrowse } from "@/components/marketplace/marketplace-browse";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { marketplaceIsLive } from "@/lib/data";

export default function MarketplacePage() {
  return (
    <AppPage title="Marketplace">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-body text-ink-secondary">Buy and sell with neighbours</p>
          <Link href="/marketplace/new" className={buttonVariants({ size: "sm" })}>
            Sell an item
          </Link>
        </div>
        {marketplaceIsLive() ? (
          <MarketplaceBrowse />
        ) : (
          <ErrorState message="The Marketplace needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
        )}
      </div>
    </AppPage>
  );
}
