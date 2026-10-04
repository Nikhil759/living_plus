import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventPrefill, istLocalInput, listingPrefill } from "./prefill";

describe("Saarthi prefill", () => {
  it("turns a watch-party proposal into host-event form values in IST", () => {
    const prefill = eventPrefill({
      tool: "create_event",
      payload: {
        body: {
          title: "World Cup final watch party",
          location_label: "Community Hall",
          starts_at: "2026-10-10T19:30:00+05:30",
          ends_at: "2026-10-10T17:00:00Z",
          category: "sports",
          capacity: 30,
          event_type: "free",
          invite_interest: "football",
        },
      },
    });
    assert.equal(prefill?.startsAt, "2026-10-10T19:30");
    assert.equal(prefill?.endsAt, "2026-10-10T22:30");
    assert.equal(prefill?.capacity, 30);
    assert.equal(prefill?.inviteInterest, "football");
    assert.equal(prefill?.locationLabel, "Community Hall");
  });

  it("only prefills from the matching proposal", () => {
    assert.equal(eventPrefill({ tool: "book_slot", payload: {} }), undefined);
    const listing = listingPrefill({
      tool: "create_listing",
      payload: { draft: { title: "Kids cycle", category: "kids", price_inr: 1500 } },
    });
    assert.deepEqual([listing?.price, listing?.isFree, listing?.condition], ["1500", false, "good"]);
  });

  it("formats any ISO time as IST wall clock", () => {
    assert.equal(istLocalInput("2026-01-01T00:00:00Z"), "2026-01-01T05:30");
  });
});
