import Link from "next/link";
import { AppPage } from "@/components/layout/app-page";
import { MarketplaceBrowse } from "@/components/marketplace/marketplace-browse";
import { MyListings } from "@/components/marketplace/my-listings";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { marketplaceIsLive } from "@/lib/data";
import { cn } from "@/lib/utils";

interface MarketplacePageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { id: "browse", label: "Browse", href: "/marketplace" },
  { id: "mine", label: "My listings", href: "/marketplace?tab=mine" },
] as const;

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const { tab } = await searchParams;
  const active = tab === "mine" ? "mine" : "browse";

  return (
    <AppPage title="Marketplace">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-body text-ink-secondary">Buy and sell with neighbours</p>
          <Link href="/marketplace/new" className={buttonVariants({ size: "sm" })}>
            Sell an item
          </Link>
        </div>
        <nav className="flex gap-6 border-b border-hairline" aria-label="Marketplace">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-headline transition-colors duration-premium ease-premium",
                active === item.id
                  ? "border-primary text-ink"
                  : "border-transparent text-ink-tertiary hover:text-ink-secondary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {!marketplaceIsLive() ? (
          <ErrorState message="The Marketplace needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
        ) : active === "mine" ? (
          <MyListings />
        ) : (
          <MarketplaceBrowse />
        )}
      </div>
    </AppPage>
  );
}
