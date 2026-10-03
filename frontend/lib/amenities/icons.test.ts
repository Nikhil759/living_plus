import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { amenityIcon } from "./icons";

describe("amenity Font Awesome icons", () => {
  it("picks a distinct icon for each seeded amenity", () => {
    const names = [
      "Badminton 1",
      "Badminton 2",
      "Tennis Court",
      "Gym",
      "Pool",
      "Café Lounge",
      "Community Hall",
      "Amphitheatre",
    ];
    const icons = names.map((name) => amenityIcon(name).iconName);
    assert.deepEqual(icons, [
      "feather-pointed",
      "feather-pointed",
      "table-tennis-paddle-ball",
      "dumbbell",
      "person-swimming",
      "mug-saucer",
      "landmark",
      "masks-theater",
    ]);
  });

  it("falls back for an unknown place", () => {
    assert.equal(amenityIcon("Rooftop garden").iconName, "location-dot");
  });
});
