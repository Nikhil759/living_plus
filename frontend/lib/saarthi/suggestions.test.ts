import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { suggestionsFor } from "./suggestions";

describe("suggestionsFor", () => {
  it("matches a section and its sub-pages", () => {
    assert.equal(suggestionsFor("/amenities")[0], "When is a court free tonight?");
    assert.equal(suggestionsFor("/amenities/abc")[0], "When is a court free tonight?");
    assert.equal(suggestionsFor("/local-businesses/x")[0], "What's on today's tiffin menu?");
  });

  it("falls back to general questions, four at a time", () => {
    assert.deepEqual(suggestionsFor("/home").length, 4);
    assert.equal(suggestionsFor("/home")[0], "What's on today?");
    assert.equal(suggestionsFor("/amenities-old")[0], "What's on today?");
  });
});
