import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { browseQueryString, cardMeta, DEFAULT_FILTERS, hasActiveFilters, listedAgo } from "./view";

const NOW = new Date("2026-10-03T12:00:00Z");

describe("marketplace view helpers", () => {
  it("describes how long ago an item was listed", () => {
    assert.equal(listedAgo("2026-10-03T11:59:40Z", NOW), "Just now");
    assert.equal(listedAgo("2026-10-03T11:30:00Z", NOW), "30 minutes ago");
    assert.equal(listedAgo("2026-10-03T07:00:00Z", NOW), "5 hours ago");
    assert.equal(listedAgo("2026-10-02T11:00:00Z", NOW), "1 day ago");
    assert.equal(listedAgo("2026-10-01T10:00:00Z", NOW), "2 days ago");
    assert.equal(listedAgo("2026-08-01T10:00:00Z", NOW), "1 Aug");
  });

  it("builds the card meta line with and without a tower", () => {
    assert.equal(cardMeta({ tower: "Tower B", listedAt: "2026-10-01T10:00:00Z" }, NOW), "Tower B · 2 days ago");
    assert.equal(cardMeta({ tower: null, listedAt: "2026-10-01T10:00:00Z" }, NOW), "2 days ago");
  });

  it("turns filters into API query params", () => {
    assert.equal(browseQueryString(DEFAULT_FILTERS), "");
    assert.equal(
      browseQueryString({ category: "electronics", query: " ps5 ", sort: "price_asc" }),
      "?category=electronics&q=ps5&sort=price_asc",
    );
    assert.equal(browseQueryString({ ...DEFAULT_FILTERS, category: "free" }), "?free=true");
  });

  it("knows when a filter narrows the list", () => {
    assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
    assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, query: "desk" }), true);
    assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, sort: "price_asc" }), false);
  });
});
