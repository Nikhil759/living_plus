import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { digestSummaryFromItems, resolveDigestSummary } from "./digest-summary";

describe("digestSummaryFromItems", () => {
  it("joins notice bodies into one line", () => {
    const text = digestSummaryFromItems([
      { id: "1", emoji: "water", lead: "Water:", body: "Tower B paused today." },
      { id: "2", emoji: "sparkle", lead: "Mela:", body: "Stall slots close Friday." },
    ]);
    assert.equal(text, "tower B paused today, and stall slots close Friday.");
  });
});

describe("resolveDigestSummary", () => {
  it("prefers explicit summary", () => {
    assert.equal(
      resolveDigestSummary({
        summary: "Custom line.",
        items: [{ id: "1", emoji: "x", lead: "A:", body: "Ignored." }],
      }),
      "Custom line.",
    );
  });
});
