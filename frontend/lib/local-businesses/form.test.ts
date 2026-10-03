import assert from "node:assert/strict";
import { test } from "node:test";
import {
  businessPayload,
  emptyBusinessForm,
  newOfferingRow,
  previewBusinessCard,
  toggleDay,
  validateBusinessForm,
  type BusinessFormValues,
} from "./form";

function valid(): BusinessFormValues {
  return {
    ...emptyBusinessForm(),
    name: "  Weekend Art Classes ",
    category: "tuition",
    tagline: "Sketching for kids",
    cover: ["/images/local-businesses/amma-cover.jpg"],
    offerings: [newOfferingRow({ name: "Monthly batch", price: "1800", unit: "per_month" })],
    timings: "10 AM to 12 PM",
    days: ["sat", "sun"],
    serves: "within_society",
  };
}

test("a complete form has no errors", () => {
  assert.deepEqual(validateBusinessForm(valid(), { needsPhone: false }), {});
});

test("an empty form reports every required field", () => {
  const errors = validateBusinessForm(emptyBusinessForm(), { needsPhone: true });
  assert.deepEqual(Object.keys(errors).sort(), [
    "category",
    "cover",
    "days",
    "name",
    "offerings",
    "phone",
    "serves",
    "tagline",
    "timings",
  ]);
});

test("length limits match the API", () => {
  const form = valid();
  form.name = "x".repeat(51);
  form.tagline = "x".repeat(81);
  form.about = "x".repeat(601);
  form.offerings = [newOfferingRow({ name: "Class", price: "100", note: "x".repeat(61) })];
  const errors = validateBusinessForm(form, { needsPhone: false });
  assert.ok(errors.name && errors.tagline && errors.about && errors.offerings);
});

test("an offering needs a name and a positive price", () => {
  const form = valid();
  form.offerings = [newOfferingRow({ name: "Class", price: "0" })];
  assert.match(validateBusinessForm(form, { needsPhone: false }).offerings ?? "", /price/);
  form.offerings = [newOfferingRow({ name: "", price: "100" })];
  assert.match(validateBusinessForm(form, { needsPhone: false }).offerings ?? "", /name/);
});

test("the payload is trimmed and carries no row keys or phone number by default", () => {
  const payload = businessPayload(valid());
  assert.equal(payload.name, "Weekend Art Classes");
  assert.equal(payload.coverUrl, "/images/local-businesses/amma-cover.jpg");
  assert.deepEqual(payload.offerings, [
    { name: "Monthly batch", priceInr: 1800, unit: "per_month", note: null },
  ]);
  assert.equal(payload.phone, undefined);
});

test("the preview uses the cheapest offering and the owner's tower", () => {
  const form = valid();
  form.offerings = [
    newOfferingRow({ name: "A", price: "3000", unit: "per_month" }),
    newOfferingRow({ name: "B", price: "250", unit: "per_hour" }),
    newOfferingRow({ name: "C", price: "", unit: "each" }),
  ];
  const card = previewBusinessCard(form, { firstName: "Nikhil", tower: "Tower C" });
  assert.deepEqual(card.startingPrice, { priceInr: 250, unit: "per_hour" });
  assert.equal(card.tower, "Tower C");
  assert.equal(previewBusinessCard(emptyBusinessForm(), { firstName: "N", tower: null }).name, "Your business name");
});

test("days toggle on and off", () => {
  assert.deepEqual(toggleDay(["sat"], "sun"), ["sat", "sun"]);
  assert.deepEqual(toggleDay(["sat", "sun"], "sat"), ["sun"]);
});
