import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessFill,
  endForFilledStart,
  eventFill,
  feedbackFill,
  fillCurrent,
  followUpText,
  freshValues,
  groupFill,
  listingFill,
  openingFill,
  postFill,
  stillFilled,
} from "./fill-mapping";

describe("Fill with Saarthi mapping", () => {
  it("keeps the acceptance example's event values and drops mistyped ones", () => {
    const fill = eventFill({
      title: "Sunday morning cycling ride",
      locationLabel: "Gate 1",
      startsAt: "2026-10-11T06:30",
      capacity: 15,
      category: "sports",
      guestLimit: "two",
      somethingElse: true,
    });
    assert.deepEqual(fill, {
      title: "Sunday morning cycling ride",
      locationLabel: "Gate 1",
      startsAt: "2026-10-11T06:30",
      capacity: 15,
      category: "sports",
    });
  });

  it("maps listings, openings and feedback by their own field names", () => {
    assert.deepEqual(listingFill({ price: "", isFree: true, condition: "good" }), {
      price: "",
      isFree: true,
      condition: "good",
    });
    assert.deepEqual(openingFill({ bhk: 3, rent: "18000", included: ["wifi"], availableNow: true }), {
      bhk: 3,
      rent: "18000",
      included: ["wifi"],
      availableNow: true,
    });
    assert.deepEqual(feedbackFill({ topic: "app", anonymous: "yes" }), { topic: "app" });
  });

  it("gives business offerings their own row keys", () => {
    let seq = 0;
    const fill = businessFill(
      { name: "Meera's Bakes", days: ["sat", "sun"], offerings: [{ name: "Banana bread", price: "350", unit: "each", note: "" }, { price: "1" }] },
      (row) => ({ key: `k${++seq}`, name: "", price: "", unit: "each", note: "", ...row }),
    );
    assert.deepEqual(fill.offerings, [{ key: "k1", name: "Banana bread", price: "350", unit: "each", note: "" }]);
    assert.deepEqual(fill.days, ["sat", "sun"]);
  });

  it("turns group tags into the form's text and post groups into ids", () => {
    assert.deepEqual(groupFill({ name: "Sunday Chess", tags: ["chess", "board games"] }), {
      name: "Sunday Chess",
      tags: "chess, board games",
    });
    const groups = [{ id: "g1", name: "Dog Parents" }];
    assert.deepEqual(postFill({ body: "Lost: brown labrador", group: "Dog Parents" }, groups), {
      body: "Lost: brown labrador",
      groupId: "g1",
    });
    assert.deepEqual(postFill({ body: "Hi all", group: "Not mine" }, groups), { body: "Hi all" });
  });

  it("shows a sparkle only while the field still holds Saarthi's value", () => {
    const filled = { capacity: 15, days: ["sat"] };
    assert.equal(stillFilled(filled, "capacity", "15"), true);
    assert.equal(stillFilled(filled, "capacity", "16"), false);
    assert.equal(stillFilled(filled, "days", ["sat"]), true);
    assert.equal(stillFilled(filled, "days", ["sat", "sun"]), false);
    assert.equal(stillFilled(filled, "title", "x"), false);
  });

  it("keeps photos and phone numbers out of edit-mode values", () => {
    assert.deepEqual(fillCurrent({ title: "Desk", photos: ["a.jpg"], phone: "98765", price: "2500" }), {
      title: "Desk",
      price: "2500",
    });
  });

  it("keeps the event's length when Saarthi only moves the start", () => {
    assert.equal(endForFilledStart("2026-10-11T16:00", "2026-10-11T18:00", "2026-10-11T06:30"), "2026-10-11T08:30");
    assert.equal(endForFilledStart("2026-10-11T16:00", "2026-10-11T15:00", "2026-10-11T19:00"), "2026-10-11T21:00");
  });

  it("sends an answer with the original sentence and applies only what changed", () => {
    assert.equal(
      followUpText("fifa night at my flat", "Which day?", "saturday 8pm"),
      'fifa night at my flat\nYou asked "Which day?" and I answered: saturday 8pm',
    );
    const last = { title: "FIFA Night", category: "social" };
    assert.deepEqual(
      freshValues({ title: "FIFA Night", category: "sports", startsAt: "2026-10-10T20:00" }, last),
      { category: "sports", startsAt: "2026-10-10T20:00" },
    );
  });
});
