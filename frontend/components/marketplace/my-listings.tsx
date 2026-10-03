"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MyListingRow } from "@/components/marketplace/my-listing-row";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyListingsApi, type MyListingsTab } from "@/lib/api/marketplace-client";
import { cn } from "@/lib/utils";
import type { MarketplaceCard } from "@/lib/types/marketplace";

const TABS: ReadonlyArray<{ id: MyListingsTab; label: string }> = [
  { id: "active", label: "Active" },
  { id: "sold", label: "Sold" },
];

export function MyListings() {
  const [tab, setTab] = useState<MyListingsTab>("active");
  const [items, setItems] = useState<MarketplaceCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetchMyListingsApi(tab, controller.signal)
      .then(setItems)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("My listings failed to load", error);
        setFailed(true);
      });
    return () => controller.abort();
  }, [tab, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const choose = (next: MyListingsTab) => {
    setItems(null);
    setTab(next);
  };

  return (
    <section className="space-y-5">
      <div className="flex gap-2" role="group" aria-label="My listings">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => choose(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium",
              tab === item.id ? "bg-primary text-white" : "bg-quiet text-ink-secondary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {failed ? (
        <ErrorState message="Couldn't load your listings." action={{ label: "Try again", onClick: reload }} />
      ) : items === null ? (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-[136px] w-full rounded-card" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title={tab === "active" ? "You haven't listed anything yet." : "Nothing sold yet."}
          action={
            tab === "active" ? (
              <Link href="/marketplace/new" className={buttonVariants({ size: "sm" })}>
                Sell an item
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((listing) => (
            <MyListingRow key={listing.id} listing={listing} onChanged={reload} />
          ))}
        </ul>
      )}
    </section>
  );
}
