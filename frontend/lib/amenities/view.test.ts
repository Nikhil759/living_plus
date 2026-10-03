import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Amenity } from "@/lib/types/home";
import {
  amenityActionHref,
  amenityStatusLabel,
  amenityTone,
  filterAmenities,
  formatBookingDay,
  formatSlotRange,
} from "./view";

const make = (name: string, category: Amenity["category"]): Amenity => ({
  id: name,
  name,
  emoji: "",
  status: "quiet",
  detail: "",
  category,
});

describe("amenity view helpers", () => {
  it("filters by category and keeps everything under All", () => {
    const list = [make("Court", "sports"), make("Gym", "fitness"), make("Hall", "spaces")];
    assert.equal(filterAmenities(list, "all").length, 3);
    assert.deepEqual(
      filterAmenities(list, "fitness").map((a) => a.name),
      ["Gym"],
    );
  });

  it("maps status to a tone and label", () => {
    assert.equal(amenityTone("booked"), "red");
    assert.equal(amenityTone("closed"), "quiet");
    assert.equal(amenityStatusLabel({ status: "booked" }), "Busy");
    assert.equal(amenityStatusLabel({ status: "quiet", statusLabel: "Moderate" }), "Moderate");
  });

  it("sends spaces to the event form and everything else to the detail page", () => {
    assert.equal(
      amenityActionHref({ id: "1", name: "Community Hall", action: "host" }),
      "/events/new?venue=Community%20Hall",
    );
    assert.equal(amenityActionHref({ id: "abc", name: "Gym", action: "view" }), "/amenities/abc");
  });

  it("describes a booking day relative to now in IST", () => {
    const now = new Date("2030-01-01T05:00:00Z");
    assert.equal(formatBookingDay("2030-01-01T12:30:00Z", now), "Today");
    assert.equal(formatBookingDay("2030-01-02T01:30:00Z", now), "Tomorrow");
    assert.equal(formatBookingDay("2030-01-05T01:30:00Z", now), "Sat, 5 Jan");
  });

  it("formats a one-hour slot", () => {
    assert.equal(formatSlotRange("2030-01-01T01:30:00Z", "2030-01-01T02:30:00Z"), "7\u20138 AM");
    assert.equal(formatSlotRange("2030-01-01T05:30:00Z", "2030-01-01T06:30:00Z"), "11 AM\u201312 PM");
  });
});
