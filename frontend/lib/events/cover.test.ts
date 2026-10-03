import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEventCoverSrc, sizedEventCoverUrl } from "./cover";

describe("sizedEventCoverUrl", () => {
  it("raises Unsplash width so the hero is not upscaled", () => {
    const src = sizedEventCoverUrl(
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      2400,
    );
    const parsed = new URL(src ?? "");
    assert.equal(parsed.searchParams.get("w"), "2400");
    assert.equal(parsed.searchParams.get("fit"), "crop");
  });

  it("leaves non-Unsplash URLs unchanged", () => {
    assert.equal(sizedEventCoverUrl("/images/events/covers/sports.svg", 2400), "/images/events/covers/sports.svg");
  });

  it("points local uploads at the API host", () => {
    assert.equal(
      resolveEventCoverSrc("/v1/uploads/event-covers/11111111-1111-1111-1111-111111111111.jpg"),
      "http://localhost:8000/v1/uploads/event-covers/11111111-1111-1111-1111-111111111111.jpg",
    );
    assert.equal(resolveEventCoverSrc("https://images.unsplash.com/photo-1"), "https://images.unsplash.com/photo-1");
  });
});
