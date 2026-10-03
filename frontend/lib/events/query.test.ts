import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotateEvent,
  eventStatusPills,
  eventViewerFromResident,
  filterEvents,
  groupUpcoming,
  type EventViewer,
} from "./query";
import type { HomeEvent, Resident } from "../types/home";

const resident: Resident = {
  id: "res-nikhil",
  name: "Nikhil Bansal",
  society: "Prestige Meridian Park",
  tower: "Tower C",
  flat: "702",
  roles: ["Tower C Rep"],
  hasUnreadNotifications: false,
};

const viewer: EventViewer = eventViewerFromResident(resident, ["evt-going"]);

function event(partial: Partial<HomeEvent> & Pick<HomeEvent, "id" | "startsAt">): HomeEvent {
  return {
    title: partial.title ?? partial.id,
    host: "Nikhil (C-702) hosting",
    hostIcon: "person",
    location: "Park gate",
    priceInr: 0,
    glyph: "general",
    goingCount: 0,
    actionLabel: "RSVP",
    actionTone: "solid",
    href: `/events/${partial.id}`,
    eventType: "free",
    status: "published",
    category: "social",
    ...partial,
  };
}

describe("eventViewerFromResident", () => {
  it("reads first name and tower without treating a tower rep as committee", () => {
    assert.equal(viewer.firstName, "Nikhil");
    assert.equal(viewer.isCommittee, false);
  });
});

describe("annotateEvent", () => {
  it("marks the matching host and RSVP", () => {
    const annotated = annotateEvent(event({ id: "evt-going", startsAt: "2030-01-01T01:30:00.000Z" }), viewer);
    assert.equal(annotated.isHost, true);
    assert.equal(annotated.viewerGoing, true);
  });

  it("keeps viewerGoing from the API when local RSVP ids are empty", () => {
    const annotated = annotateEvent(
      event({ id: "evt-api", startsAt: "2030-01-01T01:30:00.000Z", viewerGoing: true }),
      { ...viewer, rsvpIds: [] },
    );
    assert.equal(annotated.viewerGoing, true);
  });
});

describe("filterEvents", () => {
  const now = Date.parse("2026-10-03T05:00:00.000Z");
  const catalog = [
    event({ id: "walk", title: "Sunday morning walk", startsAt: "2026-10-04T01:30:00.000Z", tags: ["walking"] }),
    event({
      id: "draft",
      title: "Draft yoga",
      startsAt: "2026-10-10T01:30:00.000Z",
      status: "draft",
    }),
    event({
      id: "other-draft",
      title: "Neighbour draft",
      host: "Meera (A-301) hosting",
      startsAt: "2026-10-10T01:30:00.000Z",
      status: "draft",
    }),
    event({
      id: "paid",
      title: "Paid pottery workshop",
      startsAt: "2026-10-11T04:30:00.000Z",
      eventType: "paid",
      category: "learning",
      description: "Clay on the wheel",
    }),
    event({
      id: "past",
      title: "Old meetup",
      startsAt: "2026-09-01T14:30:00.000Z",
      endsAt: "2026-09-01T16:30:00.000Z",
      status: "completed",
    }),
  ].map((item) => annotateEvent(item, viewer));

  it("keeps upcoming published events and the viewer's pending or drafts out of other hosts", () => {
    const ids = filterEvents(catalog, { tab: "upcoming" }, now).map((item) => item.id);
    assert.deepEqual(ids, ["walk", "paid"]);
    assert.ok(!ids.includes("other-draft"));
  });

  it("includes own drafts on Hosting", () => {
    const ids = filterEvents(catalog, { tab: "hosting" }, now).map((item) => item.id);
    assert.ok(ids.includes("draft"));
    assert.ok(!ids.includes("other-draft"));
  });

  it("filters type, category, and search", () => {
    assert.deepEqual(
      filterEvents(catalog, { tab: "upcoming", eventType: "paid" }, now).map((item) => item.id),
      ["paid"],
    );
    assert.deepEqual(
      filterEvents(catalog, { tab: "upcoming", category: "learning" }, now).map((item) => item.id),
      ["paid"],
    );
    assert.deepEqual(
      filterEvents(catalog, { tab: "upcoming", q: "walking" }, now).map((item) => item.id),
      ["walk"],
    );
    assert.deepEqual(filterEvents(catalog, { tab: "past" }, now).map((item) => item.id), ["past"]);
  });
});

describe("groupUpcoming", () => {
  it("buckets through this Sunday, then next week, then later", () => {
    const saturday = Date.parse("2026-10-03T04:00:00.000Z"); // Sat 9:30am IST
    const groups = groupUpcoming(
      [
        event({ id: "sun", startsAt: "2026-10-04T01:30:00.000Z" }),
        event({ id: "next-wed", startsAt: "2026-10-07T14:30:00.000Z" }),
        event({ id: "later", startsAt: "2026-10-20T14:30:00.000Z" }),
      ],
      saturday,
    );
    assert.deepEqual(
      groups.map((group) => [group.id, group.events.map((item) => item.id)]),
      [
        ["weekend", ["sun"]],
        ["nextWeek", ["next-wed"]],
        ["later", ["later"]],
      ],
    );
  });
});

describe("eventStatusPills", () => {
  it("shows going, spots left, full, pending, and cancelled", () => {
    assert.deepEqual(
      eventStatusPills(
        event({
          id: "a",
          startsAt: "2026-10-04T01:30:00.000Z",
          viewerGoing: true,
          goingCount: 16,
          capacity: 20,
        }),
      ),
      ["You're going", "4 spots left"],
    );
    assert.deepEqual(
      eventStatusPills(
        event({
          id: "b",
          startsAt: "2026-10-04T01:30:00.000Z",
          goingCount: 20,
          capacity: 20,
        }),
      ),
      ["Full · join waitlist"],
    );
    assert.deepEqual(
      eventStatusPills(
        event({
          id: "c",
          startsAt: "2026-10-04T01:30:00.000Z",
          status: "pending_approval",
          isHost: true,
        }),
      ),
      ["Pending approval"],
    );
    assert.deepEqual(
      eventStatusPills(
        event({
          id: "d",
          startsAt: "2026-10-04T01:30:00.000Z",
          status: "cancelled",
        }),
      ),
      ["Cancelled"],
    );
  });
});
