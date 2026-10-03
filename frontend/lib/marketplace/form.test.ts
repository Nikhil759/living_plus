import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyListingForm, listingPayload, moveItem, validateListingForm } from "./form";

const valid = {
  ...emptyListingForm(),
  photos: ["/images/marketplace/yoga-mat.jpg"],
  title: "Yoga mat",
  category: "sports" as const,
  condition: "like_new" as const,
  price: "400",
};

describe("sell form validation", () => {
  it("accepts a complete form", () => {
    assert.deepEqual(validateListingForm(valid, { needsPhone: false }), {});
  });

  it("explains each missing field in plain language", () => {
    const errors = validateListingForm(emptyListingForm(), { needsPhone: true });
    assert.deepEqual(Object.keys(errors).sort(), [
      "category",
      "condition",
      "phone",
      "photos",
      "price",
      "title",
    ]);
    assert.equal(errors.photos, "Add at least one photo.");
  });

  it("does not need a price when the item is free", () => {
    assert.deepEqual(validateListingForm({ ...valid, price: "", isFree: true }, { needsPhone: false }), {});
  });

  it("enforces length limits", () => {
    const errors = validateListingForm(
      { ...valid, title: "x".repeat(61), description: "d".repeat(501) },
      { needsPhone: false },
    );
    assert.ok(errors.title && errors.description);
  });

  it("only asks for a phone number when the profile has none", () => {
    assert.equal(validateListingForm({ ...valid, phone: "98765 43210" }, { needsPhone: true }).phone, undefined);
    assert.ok(validateListingForm({ ...valid, phone: "12" }, { needsPhone: true }).phone);
  });
});

describe("sell form payload", () => {
  it("clears price and negotiable for free items", () => {
    const payload = listingPayload({ ...valid, isFree: true, negotiable: true, price: "400" });
    assert.equal(payload.priceInr, 0);
    assert.equal(payload.negotiable, false);
  });

  it("trims text and drops empty optional fields", () => {
    const payload = listingPayload({ ...valid, title: "  Yoga mat ", phone: " 98765 43210 " });
    assert.equal(payload.title, "Yoga mat");
    assert.equal(payload.description, null);
    assert.equal(payload.phone, "9876543210");
    assert.equal(listingPayload(valid).phone, undefined);
  });
});

describe("photo reordering", () => {
  it("moves a photo and keeps the rest in order", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  });

  it("ignores moves that go nowhere", () => {
    assert.deepEqual(moveItem(["a", "b"], 1, 1), ["a", "b"]);
    assert.deepEqual(moveItem(["a", "b"], 0, 5), ["a", "b"]);
  });
});
