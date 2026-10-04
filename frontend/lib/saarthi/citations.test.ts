import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripCitationMarkers } from "./citations";

describe("stripCitationMarkers", () => {
  it("removes single and grouped markers with their leading space", () => {
    assert.equal(
      stripCitationMarkers("Events end by 10:30 PM [1], [2]. Music low after 10 [2, 3]."),
      "Events end by 10:30 PM. Music low after 10.",
    );
  });

  it("leaves other brackets and plain text alone", () => {
    assert.equal(stripCitationMarkers("Tower [B] is fine"), "Tower [B] is fine");
    assert.equal(stripCitationMarkers("No sources here."), "No sources here.");
  });
});
