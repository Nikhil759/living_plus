"use client";

import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { ListingCard, ListingCardSkeleton } from "@/components/marketplace/listing-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { fetchListingsApi } from "@/lib/api/marketplace-client";
import {
  BROWSE_CHIPS,
  DEFAULT_FILTERS,
  hasActiveFilters,
  SORT_OPTIONS,
  type BrowseFilters,
} from "@/lib/marketplace/view";
import { cn } from "@/lib/utils";
import type { ListingSort, MarketplaceCard } from "@/lib/types/marketplace";

const SEARCH_DEBOUNCE_MS = 250;
const GRID = "grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3 min-[1360px]:grid-cols-4";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function MarketplaceBrowse() {
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<MarketplaceCard[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const query = useDebounced(filters.query, SEARCH_DEBOUNCE_MS);
  const { category, sort } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);
    setFailed(false);
    fetchListingsApi({ category, query, sort }, controller.signal)
      .then((result) => {
        setItems(result);
        setRefreshing(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Marketplace listings failed to load", error);
        setFailed(true);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [category, query, sort, attempt]);

  const retry = () => {
    setItems(null);
    setAttempt((value) => value + 1);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search listings</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search by title or description"
            className="h-11 w-full rounded-full bg-quiet pl-10 pr-4 text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <Select
          aria-label="Sort listings"
          className="sm:w-56"
          value={filters.sort}
          onChange={(value) => setFilters({ ...filters, sort: value as ListingSort })}
          options={SORT_OPTIONS}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Filter by category">
        {BROWSE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={filters.category === chip.id}
            onClick={() => setFilters({ ...filters, category: chip.id })}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium",
              filters.category === chip.id ? "bg-primary text-white" : "bg-quiet text-ink-secondary",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {failed ? (
        <ErrorState message="Couldn't load listings." action={{ label: "Try again", onClick: retry }} />
      ) : items === null ? (
        <div className={GRID}>
          {Array.from({ length: 8 }, (_, index) => (
            <ListingCardSkeleton key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title={
            hasActiveFilters(filters)
              ? "No listings match. Try a different search or category."
              : "Nothing here yet. Be the first to list something."
          }
          action={
            <Link href="/marketplace/new" className={buttonVariants({ size: "sm" })}>
              Sell an item
            </Link>
          }
        />
      ) : (
        <ul className={cn(GRID, "transition-opacity", refreshing && "opacity-60")} aria-busy={refreshing}>
          {items.map((listing) => (
            <li key={listing.id} className="min-w-0">
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
