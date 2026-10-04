import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barHeights, formatInr, formatLatency, formatPercent } from "./usage-format";

const day = (requests: number) => ({
  date: "2026-10-04",
  requests,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  costInr: 0,
  p50Ms: 0,
  p95Ms: 0,
  errors: 0,
});

describe("AI usage formatting", () => {
  it("formats rupees, latency and ratios", () => {
    assert.equal(formatInr(0), "₹0");
    assert.equal(formatInr(0.4268), "₹0.43");
    assert.equal(formatInr(42.25), "₹42.3");
    assert.equal(formatInr(1234.6), "₹1,235");
    assert.equal(formatLatency(850), "850 ms");
    assert.equal(formatLatency(12_340), "12.3 s");
    assert.equal(formatLatency(0), "–");
    assert.equal(formatPercent(0.75), "75%");
    assert.equal(formatPercent(null), "–");
  });

  it("scales bars to the busiest day and keeps small days visible", () => {
    assert.deepEqual(barHeights([day(0), day(1), day(50), day(100)]), [0, 4, 50, 100]);
    assert.deepEqual(barHeights([day(0), day(0)]), [0, 0]);
  });
});
