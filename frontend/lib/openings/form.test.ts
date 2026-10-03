import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyOpeningForm,
  latestAvailableFrom,
  openingPayload,
  preferenceAfterKind,
  previewOpening,
  toggleIncluded,
  validateOpeningForm,
  type OpeningFormValues,
} from "./form";
import type { OpeningOptions } from "@/lib/types/flat-opening";

const OPTIONS: OpeningOptions = {
  firstName: "Nikhil",
  towerId: "tc",
  towers: [
    { id: "ta", name: "Tower A" },
    { id: "tc", name: "Tower C" },
  ],
  hasPhone: true,
};
const TODAY = "2026-10-03";

function filled(overrides: Partial<OpeningFormValues> = {}): OpeningFormValues {
  return {
    ...emptyOpeningForm(OPTIONS),
    kind: "flatmate_needed",
    towerId: "ta",
    bhk: 2,
    furnishing: "semi_furnished",
    rent: "15000",
    description: "Second bedroom free.",
    ...overrides,
  };
}

const check = (values: OpeningFormValues, needsPhone = false) =>
  validateOpeningForm(values, { needsPhone, today: TODAY });

test("a new form starts with the viewer's tower and sensible defaults", () => {
  const form = emptyOpeningForm(OPTIONS);
  assert.equal(form.towerId, "tc");
  assert.deepEqual(
    [form.maintenanceIncluded, form.availableNow, form.preference, form.contactMethod],
    [true, true, "anyone", "whatsapp"],
  );
  assert.deepEqual(Object.keys(check(form)).sort(), ["bhk", "description", "furnishing", "kind", "rent"]);
});

test("a complete form passes", () => {
  assert.deepEqual(check(filled()), {});
});

test("rent has to be within range and says so in plain words", () => {
  assert.equal(check(filled({ rent: "" })).rent, "Enter the monthly rent.");
  assert.match(check(filled({ rent: "999" })).rent ?? "", /between ₹1,000 and ₹5,00,000/);
  assert.match(check(filled({ rent: "500001" })).rent ?? "", /between/);
  assert.equal(check(filled({ rent: "500000" })).rent, undefined);
});

test("maintenance is only asked for when it is not included", () => {
  assert.equal(check(filled({ maintenanceIncluded: true, maintenance: "" })).maintenance, undefined);
  assert.equal(
    check(filled({ maintenanceIncluded: false, maintenance: "" })).maintenance,
    "Enter the monthly maintenance amount.",
  );
  assert.equal(check(filled({ maintenanceIncluded: false, maintenance: "2500" })).maintenance, undefined);
});

test("the date must be today or later, within a year", () => {
  assert.match(check(filled({ availableNow: false, availableFrom: "" })).availableFrom ?? "", /Pick a date/);
  assert.match(
    check(filled({ availableNow: false, availableFrom: "2026-10-02" })).availableFrom ?? "",
    /today or a date/,
  );
  assert.equal(check(filled({ availableNow: false, availableFrom: TODAY })).availableFrom, undefined);
  assert.equal(latestAvailableFrom(TODAY), "2027-10-03");
  assert.match(
    check(filled({ availableNow: false, availableFrom: "2027-10-04" })).availableFrom ?? "",
    /within the next year/,
  );
});

test("description is required and capped at 400 characters", () => {
  assert.equal(check(filled({ description: "   " })).description, "Add a short description.");
  assert.match(check(filled({ description: "x".repeat(401) })).description ?? "", /under 400/);
  assert.equal(check(filled({ description: "x".repeat(400) })).description, undefined);
});

test("floor is optional and capped", () => {
  assert.equal(check(filled({ floor: "" })).floor, undefined);
  assert.equal(check(filled({ floor: "0" })).floor, undefined);
  assert.match(check(filled({ floor: "99" })).floor ?? "", /up to 60/);
});

test("phone is only checked when the profile has none", () => {
  assert.equal(check(filled(), false).phone, undefined);
  assert.match(check(filled(), true).phone ?? "", /Add your phone/);
  assert.match(check(filled({ phone: "abc" }), true).phone ?? "", /valid phone/);
  assert.equal(check(filled({ phone: "98765 43210" }), true).phone, undefined);
});

test("preferences follow the kind of opening", () => {
  assert.equal(preferenceAfterKind("full_flat", "women_only"), "anyone");
  assert.equal(preferenceAfterKind("room_available", "women_only"), "women_only");
  assert.equal(preferenceAfterKind("room_available", "family"), "anyone");
  assert.equal(preferenceAfterKind("full_flat", "family"), "family");
  assert.match(check(filled({ kind: "full_flat", preference: "men_only" })).preference ?? "", /who it suits/);
});

test("the payload carries numbers, nulls for blanks, and no phone unless needed", () => {
  const body = openingPayload(filled({ deposit: "30000", floor: "4", included: ["wifi"] }), { needsPhone: false });
  assert.equal(body.rentInr, 15000);
  assert.equal(body.depositInr, 30000);
  assert.equal(body.floor, 4);
  assert.equal(body.maintenanceInr, null);
  assert.equal(body.availableFrom, null);
  assert.equal("phone" in body, false);
  const later = openingPayload(
    filled({ availableNow: false, availableFrom: "2026-10-20", maintenanceIncluded: false, maintenance: "2,500", phone: "98765-43210" }),
    { needsPhone: true },
  );
  assert.deepEqual([later.availableFrom, later.maintenanceInr, later.phone], ["2026-10-20", 2500, "9876543210"]);
});

test("included items toggle on and off", () => {
  assert.deepEqual(toggleIncluded([], "wifi"), ["wifi"]);
  assert.deepEqual(toggleIncluded(["wifi", "ac"], "wifi"), ["ac"]);
});

test("the preview builds its title once type, BHK and tower are chosen", () => {
  assert.equal(previewOpening(emptyOpeningForm(OPTIONS), OPTIONS).title, "Your title appears here");
  const card = previewOpening(filled({ floor: "4" }), OPTIONS);
  assert.equal(card.title, "Flatmate for 2 BHK · Tower A");
  assert.deepEqual([card.rentInr, card.floor, card.postedBy, card.tower], [15000, 4, "Nikhil", "Tower A"]);
});
