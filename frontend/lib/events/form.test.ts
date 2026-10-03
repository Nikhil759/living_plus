import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { approvalExplain, eventNeedsApproval, hostSubmitLabel } from "./approval";
import {
  addHoursToLocalInput,
  eventFormDefaults,
  eventFormPayload,
  parseStallCategories,
  parseTagList,
} from "./form";

describe("event form helpers", () => {
  it("parses tags and pads a local end time", () => {
    assert.deepEqual(parseTagList(" yoga, ,walk "), ["yoga", "walk"]);
    assert.equal(addHoursToLocalInput("2030-01-01T18:00", 2), "2030-01-01T20:00");
  });

  it("builds create and edit payloads from defaults", () => {
    const values = eventFormDefaults({
      id: "walk",
      title: "Morning Walk",
      host: "Nikhil hosting",
      hostIcon: "person",
      startsAt: "2030-01-01T01:30:00.000Z",
      endsAt: "2030-01-01T03:30:00.000Z",
      location: "Park gate",
      priceInr: 0,
      glyph: "general",
      goingCount: 0,
      actionLabel: "RSVP",
      actionTone: "solid",
      href: "/events/walk",
      category: "fitness",
      capacity: 20,
      guestLimit: 1,
      description: "Easy pace.",
      whatToBring: "Water.",
      imageUrl: "https://images.unsplash.com/photo-1",
      tags: ["walking"],
    });
    assert.equal(values.category, "fitness");
    assert.equal(values.capacity, 20);
    const payload = eventFormPayload(values, { publish: true });
    assert.equal(payload.title, "Morning Walk");
    assert.equal(payload.publish, true);
    assert.equal(payload.coverUrl, "https://images.unsplash.com/photo-1");
    assert.equal(payload.eventType, "free");
    assert.equal(payload.recurrence, "none");
    assert.equal(payload.stallsEnabled, false);
  });

  it("parses stall types with optional limits", () => {
    assert.deepEqual(parseStallCategories(" Chaat:2, Handicraft, Games:3, Chaat:9 "), [
      { name: "Chaat", limit: 2 },
      { name: "Handicraft", limit: undefined },
      { name: "Games", limit: 3 },
    ]);
  });

  it("labels paid and society submits as needing approval", () => {
    assert.equal(eventNeedsApproval("paid"), true);
    assert.equal(eventNeedsApproval("free"), false);
    assert.match(approvalExplain("paid") ?? "", /committee approval/);
    assert.equal(hostSubmitLabel(undefined, "paid"), "Submit for approval");
    assert.equal(hostSubmitLabel(undefined, "free"), "Publish event");
  });
});
