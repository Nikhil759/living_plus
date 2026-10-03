"use client";

import Link from "next/link";
import { Search, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { BusinessCard, BusinessCardSkeleton } from "@/components/local-businesses/business-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { fetchBusinessesApi } from "@/lib/api/local-businesses-client";
import {
  BROWSE_CHIPS,
  DEFAULT_FILTERS,
  hasActiveFilters,
  SORT_OPTIONS,
  type BrowseFilters,
} from "@/lib/local-businesses/view";
import { cn } from "@/lib/utils";
import type { BusinessCard as BusinessCardData, BusinessSort } from "@/lib/types/local-business";

const SEARCH_DEBOUNCE_MS = 250;
const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3";
const CHIP = "shrink-0 rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function BusinessBrowse() {
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<BusinessCardData[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const query = useDebounced(filters.query, SEARCH_DEBOUNCE_MS);
  const { category, sort, takingOrders } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);
    setFailed(false);
    fetchBusinessesApi({ category, query, sort, takingOrders }, controller.signal)
      .then((result) => {
        setItems(result);
        setRefreshing(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Local businesses failed to load", error);
        setFailed(true);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [category, query, sort, takingOrders, attempt]);

  const retry = () => {
    setItems(null);
    setAttempt((value) => value + 1);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search businesses</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search by name, offering or description"
            className="h-11 w-full rounded-full bg-quiet pl-10 pr-4 text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <Select
          aria-label="Sort businesses"
          className="sm:w-56"
          value={filters.sort}
          onChange={(value) => setFilters({ ...filters, sort: value as BusinessSort })}
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
              CHIP,
              filters.category === chip.id ? "bg-primary text-white" : "bg-quiet text-ink-secondary",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-pressed={filters.takingOrders}
        onClick={() => setFilters({ ...filters, takingOrders: !filters.takingOrders })}
        className={cn(
          CHIP,
          "inline-flex items-center gap-2 border",
          filters.takingOrders
            ? "border-primary bg-primary-tint text-primary"
            : "border-hairline bg-card text-ink-secondary",
        )}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-status-green" aria-hidden="true" />
        Taking orders
      </button>

      {failed ? (
        <ErrorState message="Couldn't load businesses." action={{ label: "Try again", onClick: retry }} />
      ) : items === null ? (
        <div className={GRID}>
          {Array.from({ length: 6 }, (_, index) => (
            <BusinessCardSkeleton key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title={
            hasActiveFilters(filters)
              ? "No businesses match. Try a different search or category."
              : "No businesses yet. Be the first to list yours."
          }
          action={
            <Link href="/local-businesses/new" className={buttonVariants({ size: "sm" })}>
              List your business
            </Link>
          }
        />
      ) : (
        <ul className={cn(GRID, "transition-opacity", refreshing && "opacity-60")} aria-busy={refreshing}>
          {items.map((business) => (
            <li key={business.id} className="min-w-0">
              <BusinessCard business={business} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
