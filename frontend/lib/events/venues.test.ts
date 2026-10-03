import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VENUE_MY_FLAT,
  VENUE_OTHER,
  buildVenueOptions,
  myFlatLabel,
  presetVenueSelection,
  resolveVenue,
  venueAmenityId,
  venueLocation,
} from "./venues";

const resident = { tower: "Tower C", flat: "702" };

describe("event venues", () => {
  it("lists my flat first, society places next, and an other row last", () => {
    const options = buildVenueOptions([{ name: "Gym", emoji: "💪" }], resident);
    assert.equal(options[0].value, VENUE_MY_FLAT);
    assert.equal(options[0].hint, "Tower C, Flat 702");
    assert.equal(options[1].label, "Gym");
    assert.equal(options.at(-1)?.value, VENUE_OTHER);
  });

  it("does not repeat a common place the society already lists", () => {
    const options = buildVenueOptions([{ name: "clubhouse", emoji: "🏛️" }], resident);
    const clubhouses = options.filter((option) => option.label.toLowerCase() === "clubhouse");
    assert.equal(clubhouses.length, 1);
  });

  it("skips my flat when the resident has no flat", () => {
    assert.equal(myFlatLabel({ tower: "Tower C", flat: " " }), null);
    const options = buildVenueOptions([], { tower: "", flat: "" });
    assert.ok(!options.some((option) => option.value === VENUE_MY_FLAT));
  });

  it("round-trips a saved location through the dropdown", () => {
    const options = buildVenueOptions([{ name: "Gym", emoji: "💪" }], resident);
    assert.deepEqual(resolveVenue("Gym", options), { key: "Gym", other: "" });
    assert.deepEqual(resolveVenue("Tower C, Flat 702", options), { key: VENUE_MY_FLAT, other: "" });
    assert.deepEqual(resolveVenue("Sector 50 Park", options), {
      key: VENUE_OTHER,
      other: "Sector 50 Park",
    });
    assert.equal(venueLocation({ key: VENUE_MY_FLAT, other: "" }, options), "Tower C, Flat 702");
    assert.equal(venueLocation({ key: "Gym", other: "" }, options), "Gym");
    assert.equal(venueLocation({ key: VENUE_OTHER, other: "  Sector 50 Park " }, options), "Sector 50 Park");
    assert.equal(venueLocation({ key: "", other: "" }, options), "");
  });

  it("links a society space to its amenity and preselects it from a link", () => {
    const options = buildVenueOptions([{ id: "hall-1", name: "Community Hall", emoji: "🏠" }], resident);
    const preset = presetVenueSelection("Community Hall", options);
    assert.equal(preset.key, "Community Hall");
    assert.equal(venueAmenityId(preset, options), "hall-1");
    assert.equal(venueAmenityId({ key: "Clubhouse", other: "" }, options), undefined);
    assert.deepEqual(presetVenueSelection("Somewhere odd", options), { key: "", other: "" });
    assert.deepEqual(presetVenueSelection(undefined, options), { key: "", other: "" });
  });
});
