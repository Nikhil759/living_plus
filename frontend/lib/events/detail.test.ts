import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEventRange } from "../format";
import {
  attachHostProfile,
  eventAudienceLabel,
  eventBanners,
  eventCapacityLabel,
  eventCapacityRatio,
  eventCoverPill,
  eventGoingLabel,
  eventGuestLabel,
  eventIcs,
  eventMainAction,
  eventSpotsLabel,
  eventVenueHref,
  hostedEventCount,
} from "./detail";
import { annotateEvent, canViewEvent, eventViewerFromResident } from "./query";
import type { EventAttendee, HomeEvent, Resident } from "../types/home";

const resident: Resident = {
  id: "res-nikhil",
  name: "Nikhil Bansal",
  avatarUrl: "/mock/avatar-nikhil.jpg",
  society: "Prestige Meridian Park",
  tower: "Tower C",
  flat: "702",
  roles: ["Tower C Rep"],
  hasUnreadNotifications: false,
};

const viewer = eventViewerFromResident(resident, ["evt-going"]);

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

describe("canViewEvent", () => {
  it("hides drafts, pending, and rejected from neighbours", () => {
    const draft = annotateEvent(event({ id: "draft", startsAt: "2030-01-01T01:30:00.000Z", status: "draft" }), {
      ...viewer,
      id: "res-other",
      firstName: "Meera",
    });
    assert.equal(canViewEvent(draft), false);
    assert.equal(
      canViewEvent(annotateEvent(event({ id: "own", startsAt: "2030-01-01T01:30:00.000Z", status: "draft" }), viewer)),
      true,
    );
  });
});

describe("annotateEvent privacy", () => {
  it("shows first names of visible attendees and the full list only to the host", () => {
    const going: EventAttendee[] = [
      { id: "a", name: "Divya Rao", tower: "Tower A", guestCount: 1 },
      { id: "b", name: "Amit Khanna", isVisible: false, fullName: "Amit Khanna", tower: "Tower B", guestCount: 2 },
    ];
    const raw = event({
      id: "club",
      startsAt: "2030-01-01T01:30:00.000Z",
      going,
    });
    const hostView = annotateEvent(raw, viewer);
    assert.deepEqual(
      hostView.going?.map((person) => person.name),
      ["Divya"],
    );
    assert.equal(hostView.attendees?.length, 2);
    assert.equal(hostView.attendees?.[1]?.fullName, "Amit Khanna");

    const neighbour = annotateEvent(raw, {
      ...viewer,
      id: "res-other",
      firstName: "Meera",
      tower: "Tower A",
      flat: "301",
    });
    assert.equal(neighbour.attendees, null);
    assert.deepEqual(
      neighbour.going?.map((person) => person.name),
      ["Divya"],
    );
  });
});

describe("eventMainAction", () => {
  const future = event({ id: "live", startsAt: "2030-01-01T01:30:00.000Z", endsAt: "2030-01-01T03:30:00.000Z" });

  it("picks RSVP, paid, waitlist, leave, stall, and closed labels", () => {
    assert.deepEqual(eventMainAction(future), { kind: "rsvp", label: "I'm going", enabled: true });
    assert.deepEqual(eventMainAction({ ...future, eventType: "paid", priceInr: 499 }), {
      kind: "pay",
      label: "Book ticket · ₹499",
      enabled: false,
    });
    assert.deepEqual(eventMainAction({ ...future, goingCount: 16, capacity: 16 }), {
      kind: "waitlist",
      label: "Join waitlist",
      enabled: false,
    });
    assert.deepEqual(eventMainAction({ ...future, viewerGoing: true }), {
      kind: "leave",
      label: "Can't make it?",
      enabled: true,
    });
    assert.deepEqual(eventMainAction({ ...future, eventType: "society", stallsEnabled: true }), {
      kind: "stall",
      label: "Apply for a stall",
      enabled: false,
    });
    assert.deepEqual(eventMainAction({ ...future, status: "cancelled" }), {
      kind: "cancelled",
      label: "Cancelled",
      enabled: false,
    });
    assert.deepEqual(eventMainAction({ ...future, status: "pending_approval" }), {
      kind: "pending",
      label: "Pending approval",
      enabled: false,
    });
    assert.equal(eventMainAction(future, Date.parse("2031-01-01T00:00:00.000Z")).kind, "ended");
  });
});

describe("eventBanners and labels", () => {
  it("builds banners, capacity, guests, and amenity links", () => {
    assert.deepEqual(
      eventBanners(
        event({
          id: "x",
          startsAt: "2030-01-01T01:30:00.000Z",
          status: "cancelled",
          cancelReason: "Rain",
          changeSummary: "Time changed to 8:00 PM",
        }),
      ),
      [
        { tone: "danger", text: "Cancelled: Rain" },
        { tone: "info", text: "Changed: Time changed to 8:00 PM" },
      ],
    );
    assert.equal(
      eventBanners(
        event({
          id: "rej",
          startsAt: "2030-01-01T01:30:00.000Z",
          status: "rejected",
          rejectionReason: "Hall is booked.",
        }),
      )[0]?.text,
      "Rejected: Hall is booked.",
    );
    assert.equal(eventCapacityLabel({ goingCount: 14, capacity: 20 }), "14 of 20 spots taken");
    assert.equal(eventSpotsLabel({ goingCount: 9, capacity: 20 }), "9 of 20 spots");
    assert.equal(eventCapacityRatio({ goingCount: 9, capacity: 20 }), 0.45);
    assert.equal(eventGuestLabel(1), "Guests welcome · up to 1 each");
    assert.equal(eventGuestLabel(0), undefined);
    assert.equal(eventAudienceLabel({}), "Residents only");
    assert.equal(eventAudienceLabel({ guestLimit: 1 }), "Guests welcome · up to 1 each");
    assert.equal(eventAudienceLabel({ audience: "group" }), "Group members");
    assert.equal(eventCoverPill({ eventType: "free", priceInr: 0 }), "Free");
    assert.equal(eventCoverPill({ eventType: "society", priceInr: 0 }), "Society");
    assert.equal(eventGoingLabel(), "You're going");
    assert.equal(eventGoingLabel(1), "You're going · 1 guest");
    assert.equal(eventGoingLabel(2), "You're going · 2 guests");
    assert.equal(eventVenueHref({ location: "Tennis Courts", amenityId: "am-tennis" }), "/amenities#am-tennis");
    assert.equal(eventVenueHref({ location: "Park gate" }), undefined);
  });
});

describe("host profile and calendar", () => {
  it("counts published and completed events for the host", () => {
    const catalog = [
      event({ id: "a", startsAt: "2030-01-01T01:30:00.000Z", hostUserId: "res-nikhil", status: "published" }),
      event({ id: "b", startsAt: "2026-01-01T01:30:00.000Z", hostUserId: "res-nikhil", status: "completed" }),
      event({ id: "c", startsAt: "2030-01-02T01:30:00.000Z", hostUserId: "res-nikhil", status: "draft" }),
    ];
    assert.equal(hostedEventCount(catalog[0], catalog), 2);
    const detailed = attachHostProfile(annotateEvent(catalog[0], viewer), catalog, resident);
    assert.equal(detailed.hostProfile?.name, "Nikhil");
    assert.equal(detailed.hostProfile?.tower, "Tower C");
    assert.equal(detailed.hostProfile?.eventsHosted, 2);
  });

  it("writes a downloadable invite", () => {
    const ics = eventIcs(
      event({
        id: "walk",
        title: "Sunday morning walk",
        startsAt: "2026-10-04T01:30:00.000Z",
        endsAt: "2026-10-04T03:30:00.000Z",
        location: "Park gate",
        description: "Easy loop.",
      }),
      "https://living.plus/events/walk",
    );
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /SUMMARY:Sunday morning walk/);
    assert.match(ics, /DTSTART:20261004T013000Z/);
    assert.match(ics, /DTEND:20261004T033000Z/);
    assert.match(ics, /LOCATION:Park gate/);
    assert.match(ics, /URL:https:\/\/living.plus\/events\/walk/);
  });
});

describe("formatEventRange", () => {
  it("shows end time only when the day is the same", () => {
    assert.equal(
      formatEventRange("2026-10-03T15:30:00.000Z", "2026-10-03T17:30:00.000Z"),
      "Sat, 9:00 PM – 11:00 PM",
    );
    assert.equal(
      formatEventRange("2026-10-03T15:30:00.000Z", "2026-10-03T19:30:00.000Z"),
      "Sat, 9:00 PM – Sun, 1:00 AM",
    );
  });
});
