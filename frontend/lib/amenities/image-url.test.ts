import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { amenityImageUrl, amenityPhotoSlug, resolveAmenityImageSrc } from "./image-url";

describe("amenityPhotoSlug", () => {
  it("matches backend slug rules", () => {
    assert.equal(amenityPhotoSlug("Café Lounge"), "cafe-lounge");
    assert.equal(amenityPhotoSlug("Badminton 1"), "badminton-1");
  });
});

describe("amenityImageUrl", () => {
  it("points at bundled public assets", () => {
    assert.equal(amenityImageUrl("Gym"), "/images/amenities/gym.jpg");
  });
});

describe("resolveAmenityImageSrc", () => {
  it("falls back to name-based path when imageUrl is missing", () => {
    assert.equal(resolveAmenityImageSrc({ name: "Pool" }), "/images/amenities/pool.jpg");
  });

  it("keeps an explicit imageUrl", () => {
    assert.equal(resolveAmenityImageSrc({ name: "Pool", imageUrl: "/custom.jpg" }), "/custom.jpg");
  });
});
