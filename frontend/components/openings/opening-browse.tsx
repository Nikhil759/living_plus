"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { OpeningCard, OpeningCardSkeleton } from "@/components/openings/opening-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { fetchOpeningsApi } from "@/lib/api/openings-client";
import {
  BHK_OPTIONS,
  BUDGET_LABEL,
  BUDGETS,
  DEFAULT_FILTERS,
  FURNISHING_CHIP,
  FURNISHINGS,
  hasActiveFilters,
  KIND_LABEL,
  KINDS,
  SORT_OPTIONS,
  type BrowseFilters,
} from "@/lib/openings/view";
import { cn } from "@/lib/utils";
import type { FlatOpeningCard, OpeningSort } from "@/lib/types/flat-opening";

const GRID = "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5";
const CHIP = "shrink-0 rounded-full px-3 py-1.5 text-callout transition-colors duration-premium ease-premium";

interface ChipGroupProps<T extends string | number> {
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T | null;
  onChange: (value: T | null) => void;
  /** Adds an "All" chip that clears the choice. Other groups clear by tapping the chip again. */
  withAll?: boolean;
}

function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  withAll = false,
}: ChipGroupProps<T>) {
  const chip = (selected: boolean, text: string, onClick: () => void) => (
    <button
      key={text}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(CHIP, selected ? "bg-primary text-white" : "bg-quiet text-ink-secondary")}
    >
      {text}
    </button>
  );

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-caption text-ink-tertiary">{label}</span>
      <div className="flex min-w-0 gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={label}>
        {withAll ? chip(value === null, "All", () => onChange(null)) : null}
        {options.map((option) =>
          chip(value === option.id, option.label, () => onChange(value === option.id ? null : option.id)),
        )}
      </div>
    </div>
  );
}

const KIND_OPTIONS = KINDS.map((id) => ({ id, label: KIND_LABEL[id] }));
const BHK_CHIPS = BHK_OPTIONS.map((id) => ({ id, label: id === 4 ? "4+" : String(id) }));
const BUDGET_OPTIONS = BUDGETS.map((id) => ({ id, label: BUDGET_LABEL[id] }));
const FURNISHING_OPTIONS = FURNISHINGS.map((id) => ({ id, label: FURNISHING_CHIP[id] }));

export function OpeningBrowse() {
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<FlatOpeningCard[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { kind, bhk, budget, furnishing, sort } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);
    setFailed(false);
    fetchOpeningsApi({ kind, bhk, budget, furnishing, sort }, controller.signal)
      .then((result) => {
        setItems(result);
        setRefreshing(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Flat openings failed to load", error);
        setFailed(true);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [kind, bhk, budget, furnishing, sort, attempt]);

  const retry = () => {
    setItems(null);
    setAttempt((value) => value + 1);
  };
  const set = <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <ChipGroup label="Type" withAll options={KIND_OPTIONS} value={kind} onChange={(v) => set("kind", v)} />
          <ChipGroup label="BHK" options={BHK_CHIPS} value={bhk} onChange={(v) => set("bhk", v)} />
          <ChipGroup label="Budget" options={BUDGET_OPTIONS} value={budget} onChange={(v) => set("budget", v)} />
          <ChipGroup
            label="Furnishing"
            options={FURNISHING_OPTIONS}
            value={furnishing}
            onChange={(v) => set("furnishing", v)}
          />
        </div>
        <Select
          aria-label="Sort openings"
          className="sm:w-48 sm:shrink-0"
          value={sort}
          onChange={(value) => set("sort", value as OpeningSort)}
          options={SORT_OPTIONS}
        />
      </div>

      {failed ? (
        <ErrorState message="Couldn't load flat openings." action={{ label: "Try again", onClick: retry }} />
      ) : items === null ? (
        <div className={GRID}>
          {Array.from({ length: 4 }, (_, index) => (
            <OpeningCardSkeleton key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        hasActiveFilters(filters) ? (
          <EmptyState
            icon={<Home />}
            title="No openings match these filters."
            action={
              <Button size="sm" variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Home />}
            title="No openings right now. Post one?"
            action={
              <Link href="/flat-openings/new" className={buttonVariants({ size: "sm" })}>
                Post an opening
              </Link>
            }
          />
        )
      ) : (
        <ul className={cn(GRID, "transition-opacity", refreshing && "opacity-60")} aria-busy={refreshing}>
          {items.map((opening) => (
            <li key={opening.id} className="min-w-0">
              <OpeningCard opening={opening} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
