import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availableLabel,
  browseQueryString,
  cardFacts,
  DEFAULT_FILTERS,
  floorLabel,
  formatInr,
  formatRent,
  generateTitle,
  maintenanceLabel,
  postedAgo,
} from "./view";
import type { FlatOpeningCard } from "@/lib/types/flat-opening";

test("titles are generated from kind, BHK and tower", () => {
  assert.equal(generateTitle("room_available", 1, "Tower C"), "Room in 1 BHK · Tower C");
  assert.equal(generateTitle("flatmate_needed", 2, "Tower B"), "Flatmate for 2 BHK · Tower B");
  assert.equal(generateTitle("full_flat", 3, "Tower A"), "Entire 3 BHK · Tower A");
  assert.equal(generateTitle("full_flat", 4, "Tower A"), "Entire 4+ BHK · Tower A");
});

test("rent uses Indian digit grouping", () => {
  assert.equal(formatRent(18000), "₹18,000/mo");
  assert.equal(formatInr(195000), "₹1,95,000");
  assert.equal(maintenanceLabel(true, null), "Included");
  assert.equal(maintenanceLabel(false, 2500), "₹2,500/mo");
});

test("floors read as ordinals", () => {
  assert.equal(floorLabel(null), null);
  assert.equal(floorLabel(0), "Ground floor");
  assert.deepEqual([1, 2, 3, 5, 11, 12, 13, 21, 22].map(floorLabel), [
    "1st floor",
    "2nd floor",
    "3rd floor",
    "5th floor",
    "11th floor",
    "12th floor",
    "13th floor",
    "21st floor",
    "22nd floor",
  ]);
});

test("availability is a calendar day, not a timezone-shifted instant", () => {
  assert.equal(availableLabel(null), "Available now");
  assert.equal(availableLabel("2026-10-15"), "Available from 15 Oct");
  assert.equal(availableLabel("2026-11-01"), "Available from 1 Nov");
});

test("posted age is in whole days", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(postedAgo("2026-10-03T01:00:00Z", now), "today");
  assert.equal(postedAgo("2026-10-02T09:00:00Z", now), "yesterday");
  assert.equal(postedAgo("2026-09-30T09:00:00Z", now), "3 days ago");
});

test("the query string only carries chosen filters", () => {
  assert.equal(browseQueryString(DEFAULT_FILTERS), "");
  assert.equal(
    browseQueryString({ ...DEFAULT_FILTERS, kind: "room_available", budget: "under_20k" }),
    "?kind=room_available&budget=under_20k",
  );
  assert.equal(browseQueryString({ ...DEFAULT_FILTERS, bhk: 4, sort: "rent_asc" }), "?bhk=4&sort=rent_asc");
});

test("card facts skip the floor when it is not given", () => {
  const base: FlatOpeningCard = {
    id: "1",
    kind: "room_available",
    title: "Room in 1 BHK · Tower C",
    rentInr: 18000,
    bhk: 1,
    tower: "Tower C",
    floor: 5,
    furnishing: "semi_furnished",
    availableFrom: null,
    preference: "women_only",
    description: "",
    contactMethod: "whatsapp",
    postedBy: "Meera",
    postedAt: "2026-10-01T00:00:00Z",
    isMine: false,
    state: "active",
  };
  assert.deepEqual(cardFacts(base), ["Semi-furnished", "Available now", "Women only", "5th floor"]);
  assert.deepEqual(cardFacts({ ...base, floor: null }), ["Semi-furnished", "Available now", "Women only"]);
});
