"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { INPUT } from "@/components/marketplace/listing-form";
import {
  MAX_OFFERING_NAME,
  MAX_OFFERING_NOTE,
  MAX_OFFERINGS,
  moveItem,
  newOfferingRow,
  type OfferingRow,
} from "@/lib/local-businesses/form";
import { OFFERING_UNITS, UNIT_LABEL } from "@/lib/local-businesses/view";
import type { OfferingUnit } from "@/lib/types/local-business";

const UNIT_OPTIONS = OFFERING_UNITS.map((unit) => ({ value: unit, label: UNIT_LABEL[unit] }));
const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full bg-quiet text-ink-secondary hover:text-ink disabled:opacity-30";

/** Add, remove and reorder offering rows: name, price, unit and an optional note. */
export function OfferingsEditor({
  rows,
  onChange,
}: {
  rows: OfferingRow[];
  onChange: (rows: OfferingRow[]) => void;
}) {
  function update(key: string, patch: Partial<OfferingRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.key} className="space-y-2.5 rounded-card bg-card p-3.5 shadow-card">
            <div className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(event) => update(row.key, { name: event.target.value })}
                maxLength={MAX_OFFERING_NAME + 20}
                aria-label={`Offering ${index + 1} name`}
                placeholder="e.g. Veg meals"
                className={INPUT}
              />
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onChange(moveItem(rows, index, index - 1))}
                aria-label={`Move offering ${index + 1} up`}
                className={ICON_BUTTON}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={index === rows.length - 1}
                onClick={() => onChange(moveItem(rows, index, index + 1))}
                aria-label={`Move offering ${index + 1} down`}
                className={ICON_BUTTON}
              >
                <ArrowDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={rows.length === 1}
                onClick={() => onChange(rows.filter((item) => item.key !== row.key))}
                aria-label={`Remove offering ${index + 1}`}
                className={ICON_BUTTON}
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-ink-secondary">
                  ₹
                </span>
                <input
                  inputMode="numeric"
                  value={row.price}
                  onChange={(event) =>
                    update(row.key, { price: event.target.value.replace(/\D/g, "").slice(0, 8) })
                  }
                  aria-label={`Offering ${index + 1} price`}
                  placeholder="Price"
                  className={`${INPUT} pl-8`}
                />
              </div>
              <Select
                aria-label={`Offering ${index + 1} unit`}
                value={row.unit}
                onChange={(value) => update(row.key, { unit: value as OfferingUnit })}
                options={UNIT_OPTIONS}
              />
            </div>
            <input
              value={row.note}
              onChange={(event) => update(row.key, { note: event.target.value })}
              maxLength={MAX_OFFERING_NOTE + 20}
              aria-label={`Offering ${index + 1} note (optional)`}
              placeholder='Optional note, e.g. "3 seats left"'
              className={INPUT}
            />
          </li>
        ))}
      </ul>
      {rows.length < MAX_OFFERINGS ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...rows, newOfferingRow()])}
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Add an offering
        </Button>
      ) : null}
    </div>
  );
}
