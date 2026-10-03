import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getApiBaseUrl, resolveApiUrl } from "./config";

describe("resolveApiUrl", () => {
  it("keeps Next.js demo routes on this origin", () => {
    assert.equal(resolveApiUrl("/api/demo/events/evt-yoga/rsvp"), "/api/demo/events/evt-yoga/rsvp");
    assert.equal(resolveApiUrl("api/demo/resident"), "/api/demo/resident");
  });

  it("sends FastAPI paths to the backend base URL", () => {
    assert.equal(resolveApiUrl("/v1/events/evt-yoga/rsvp"), `${getApiBaseUrl()}/v1/events/evt-yoga/rsvp`);
  });

  it("strips a trailing /v1 from NEXT_PUBLIC_API_URL", () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/v1/";
    try {
      assert.equal(getApiBaseUrl(), "https://api.example.com");
      assert.equal(resolveApiUrl("/v1/health"), "https://api.example.com/v1/health");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_API_URL;
      else process.env.NEXT_PUBLIC_API_URL = prev;
    }
  });
});
