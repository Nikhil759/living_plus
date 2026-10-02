"use client";

import { cn } from "@/lib/utils";
import {
  PROFILE_INTEREST_MAX,
  interestCatalogForUser,
  normalizeInterestLabel,
} from "@/lib/profile/interest-options";

interface InterestPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

function interestKey(label: string): string {
  return label.toLowerCase();
}

export function InterestPicker({ value, onChange, max = PROFILE_INTEREST_MAX }: InterestPickerProps) {
  const selectedKeys = new Set(value.map(interestKey));
  const options = interestCatalogForUser(value);

  function toggle(label: string) {
    const key = interestKey(label);
    if (selectedKeys.has(key)) {
      onChange(value.filter((item) => interestKey(item) !== key));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, normalizeInterestLabel(label)]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-ink-tertiary">
          Tap to add — great for neighbour matches
        </span>
        <span className="text-caption tabular-nums text-ink-tertiary">
          {value.length}/{max}
        </span>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Select interests"
      >
        {options.map((label) => {
          const selected = selectedKeys.has(interestKey(label));
          const disabled = !selected && value.length >= max;
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(label)}
              className={cn(
                "rounded-full px-3 py-1.5 text-callout font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selected
                  ? "bg-primary text-white shadow-sm"
                  : "bg-quiet text-ink-secondary hover:bg-surface-container",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {value.length >= max ? (
        <p className="text-caption text-ink-tertiary">Remove one to add another.</p>
      ) : null}
    </div>
  );
}
