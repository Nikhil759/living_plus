import assert from "node:assert/strict";
import { test } from "node:test";
import {
  browseQueryString,
  daysLabel,
  DEFAULT_FILTERS,
  hasActiveFilters,
  homePicks,
  ownerLine,
  priceWithUnit,
  recommendedLabel,
  shortAgo,
  startingPriceLabel,
} from "./view";
import type { BusinessCard } from "@/lib/types/local-business";

function card(overrides: Partial<BusinessCard>): BusinessCard {
  return {
    id: "1",
    name: "Biz",
    category: "food",
    tagline: "",
    coverUrl: "",
    ownerFirstName: "Lakshmi",
    tower: "Tower B",
    startingPrice: null,
    recommendationCount: 0,
    availability: "taking_orders",
    reviewStatus: "approved",
    isFeatured: false,
    isMine: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("prices read with their unit", () => {
  assert.equal(priceWithUnit(120, "per_meal"), "₹120/meal");
  assert.equal(priceWithUnit(3200, "per_month"), "₹3,200/month");
  assert.equal(priceWithUnit(1500, "each"), "₹1,500 each");
  assert.equal(startingPriceLabel({ priceInr: 250, unit: "per_hour" }), "from ₹250/hour");
  assert.equal(startingPriceLabel(null), null);
});

test("recommendation and owner lines", () => {
  assert.equal(recommendedLabel(1), "Recommended by 1 neighbour");
  assert.equal(recommendedLabel(14), "Recommended by 14 neighbours");
  assert.equal(ownerLine({ ownerFirstName: "Lakshmi", tower: "Tower B" }), "Lakshmi · Tower B");
  assert.equal(ownerLine({ ownerFirstName: "Lakshmi", tower: null }), "Lakshmi");
});

test("query string only carries non-default filters", () => {
  assert.equal(browseQueryString(DEFAULT_FILTERS), "");
  assert.equal(
    browseQueryString({ category: "food", query: " tiffin ", takingOrders: true, sort: "newest" }),
    "?category=food&q=tiffin&taking_orders=true&sort=newest",
  );
  assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, takingOrders: true }), true);
});

test("home shows featured first, then the rest, up to the limit", () => {
  const cards = [
    card({ id: "a" }),
    card({ id: "b", isFeatured: true }),
    card({ id: "c" }),
    card({ id: "d", isFeatured: true }),
    card({ id: "e", reviewStatus: "pending", isFeatured: true }),
  ];
  assert.deepEqual(
    homePicks(cards, 3).map((item) => item.id),
    ["b", "d", "a"],
  );
});

test("days read naturally", () => {
  assert.equal(daysLabel(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), "Every day");
  assert.equal(daysLabel(["fri", "mon", "tue", "wed", "thu"]), "Mon to Fri");
  assert.equal(daysLabel(["sat", "sun"]), "Sat, Sun");
  assert.equal(daysLabel(["mon", "wed", "fri"]), "Mon, Wed, Fri");
});

test("updates show a short age", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(shortAgo("2026-10-03T11:59:40Z", now), "just now");
  assert.equal(shortAgo("2026-10-03T11:30:00Z", now), "30m ago");
  assert.equal(shortAgo("2026-10-03T10:00:00Z", now), "2h ago");
  assert.equal(shortAgo("2026-10-01T12:00:00Z", now), "2d ago");
});
