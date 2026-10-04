"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OpeningCard } from "@/components/openings/opening-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CHIP, Field, INPUT } from "@/components/marketplace/listing-form";
import { FillWithSaarthi } from "@/components/saarthi/fill-with-saarthi";
import { useFilledFields } from "@/components/saarthi/sparkle";
import { ApiError } from "@/lib/api/client";
import { createOpeningApi, updateOpeningApi } from "@/lib/api/openings-client";
import {
  emptyOpeningForm,
  latestAvailableFrom,
  MAX_DESCRIPTION,
  openingFormFrom,
  openingPayload,
  preferenceAfterKind,
  previewOpening,
  toggleIncluded,
  todayIst,
  validateOpeningForm,
  type OpeningFormErrors,
  type OpeningFormField,
  type OpeningFormValues,
} from "@/lib/openings/form";
import { fillCurrent, openingFill } from "@/lib/saarthi/fill-mapping";
import {
  BHK_OPTIONS,
  FURNISHING_LABEL,
  FURNISHINGS,
  INCLUDED_ITEMS,
  INCLUDED_LABEL,
  KIND_BLURB,
  KIND_LABEL,
  KINDS,
  PREFERENCE_LABEL,
  PREFERENCES_FOR,
} from "@/lib/openings/view";
import { cn } from "@/lib/utils";
import type {
  FlatOpeningDetail,
  OpeningContactMethod,
  OpeningOptions,
} from "@/lib/types/flat-opening";

const SELECTED = "bg-primary text-white";
const IDLE = "bg-quiet text-ink-secondary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-card bg-card p-5 shadow-card sm:p-6" aria-label={title}>
      <h2 className="text-headline text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(CHIP, selected ? SELECTED : IDLE)}
    >
      {children}
    </button>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-ink-secondary">₹</span>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 8))}
        placeholder={placeholder}
        className={`${INPUT} pl-8`}
      />
    </div>
  );
}

/** One page for posting and editing an opening, with a live preview of its directory card. */
export function OpeningForm({ options, opening }: { options: OpeningOptions; opening?: FlatOpeningDetail }) {
  const router = useRouter();
  const [values, setValues] = useState<OpeningFormValues>(
    opening ? openingFormFrom(opening) : emptyOpeningForm(options),
  );
  const [errors, setErrors] = useState<OpeningFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsPhone = !options.hasPhone;
  const today = todayIst();
  const towerOptions = options.towers.map((tower) => ({ value: tower.id, label: tower.name }));
  const preferences = PREFERENCES_FOR[values.kind || "room_available"];
  const fills = useFilledFields();

  function set<K extends OpeningFormField>(field: K, value: OpeningFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function chooseKind(kind: OpeningFormValues["kind"]) {
    if (kind === "") return;
    setValues((current) => ({ ...current, kind, preference: preferenceAfterKind(kind, current.preference) }));
    setErrors((current) => ({ ...current, kind: undefined, preference: undefined }));
  }

  function applyFill(raw: Record<string, unknown>) {
    const fill = openingFill(raw);
    setValues((current) => {
      const next = { ...current, ...fill };
      // Keep the preference valid for the kind, as picking a kind by hand does.
      if (fill.kind && !fill.preference) next.preference = preferenceAfterKind(fill.kind, current.preference);
      return next;
    });
    setErrors((current) => ({ ...current, ...Object.fromEntries(Object.keys(fill).map((k) => [k, undefined])) }));
    fills.mark(fill);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateOpeningForm(values, { needsPhone });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const body = openingPayload(values, { needsPhone });
      const saved = opening ? await updateOpeningApi(opening.id, body) : await createOpeningApi(body);
      router.push(`/flat-openings/${saved.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save your opening. Please try again.";
      if (err instanceof ApiError && err.code === "phone_required") setErrors({ phone: message });
      else if (err instanceof ApiError && err.code === "invalid_tower") setErrors({ towerId: message });
      else setSubmitError(message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="mx-auto w-full max-w-content">
      <div className="lg:flex lg:items-start lg:justify-center lg:gap-10">
        <div className="min-w-0 space-y-5 lg:max-w-[640px] lg:flex-1">
          <FillWithSaarthi form="opening" current={opening ? fillCurrent(values) : undefined} onFill={applyFill} />
          <Section title="What are you posting?">
            <div role="radiogroup" aria-label="What are you posting?" className="grid gap-3">
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={values.kind === kind}
                  onClick={() => chooseKind(kind)}
                  className={cn(
                    "rounded-card border-2 p-4 text-left transition-colors duration-premium ease-premium",
                    values.kind === kind ? "border-primary bg-primary-tint" : "border-transparent bg-quiet",
                  )}
                >
                  <span className="block text-headline text-ink">{KIND_LABEL[kind]}</span>
                  <span className="block text-callout text-ink-secondary">{KIND_BLURB[kind]}</span>
                </button>
              ))}
            </div>
            {errors.kind ? (
              <p role="alert" className="text-caption text-status-red">
                {errors.kind}
              </p>
            ) : null}
          </Section>

          <Section title="The flat">
            <Field label="Tower" htmlFor="op-tower" error={errors.towerId}>
              <Select
                id="op-tower"
                value={values.towerId}
                placeholder="Choose a tower"
                invalid={Boolean(errors.towerId)}
                onChange={(value) => set("towerId", value)}
                options={towerOptions}
              />
            </Field>
            <Field
              label="Floor (optional)" sparkle={fills.shows("floor", values.floor)}
              htmlFor="op-floor"
              error={errors.floor}
              hint="Use 0 for the ground floor. We never show your flat number."
            >
              <input
                id="op-floor"
                inputMode="numeric"
                value={values.floor}
                onChange={(event) => set("floor", event.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="e.g. 5"
                className={INPUT}
              />
            </Field>
            <Field label="BHK" sparkle={fills.shows("bhk", values.bhk)} error={errors.bhk}>
              <div className="flex gap-2" role="group" aria-label="BHK">
                {BHK_OPTIONS.map((bhk) => (
                  <Chip key={bhk} selected={values.bhk === bhk} onClick={() => set("bhk", bhk)}>
                    {bhk === 4 ? "4+" : bhk}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Furnishing" sparkle={fills.shows("furnishing", values.furnishing)} error={errors.furnishing}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Furnishing">
                {FURNISHINGS.map((furnishing) => (
                  <Chip
                    key={furnishing}
                    selected={values.furnishing === furnishing}
                    onClick={() => set("furnishing", furnishing)}
                  >
                    {FURNISHING_LABEL[furnishing]}
                  </Chip>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Rent">
            <Field label="Monthly rent" sparkle={fills.shows("rent", values.rent)} htmlFor="op-rent" error={errors.rent} hint="Between ₹1,000 and ₹5,00,000.">
              <MoneyInput id="op-rent" value={values.rent} onChange={(value) => set("rent", value)} placeholder="18000" />
            </Field>
            <Field label="Deposit (optional)" sparkle={fills.shows("deposit", values.deposit)} htmlFor="op-deposit" error={errors.deposit}>
              <MoneyInput
                id="op-deposit"
                value={values.deposit}
                onChange={(value) => set("deposit", value)}
                placeholder="36000"
              />
            </Field>
            <Field label="Maintenance" error={errors.maintenance}>
              <div className="flex gap-2" role="group" aria-label="Maintenance included">
                <Chip selected={values.maintenanceIncluded} onClick={() => set("maintenanceIncluded", true)}>
                  Included in rent
                </Chip>
                <Chip selected={!values.maintenanceIncluded} onClick={() => set("maintenanceIncluded", false)}>
                  Paid separately
                </Chip>
              </div>
              {values.maintenanceIncluded ? null : (
                <MoneyInput
                  id="op-maintenance"
                  value={values.maintenance}
                  onChange={(value) => set("maintenance", value)}
                  placeholder="Amount per month"
                />
              )}
            </Field>
            <Field label="Available from" sparkle={fills.shows("availableFrom", values.availableFrom) || fills.shows("availableNow", values.availableNow)} error={errors.availableFrom}>
              <div className="flex gap-2" role="group" aria-label="Available from">
                <Chip selected={values.availableNow} onClick={() => set("availableNow", true)}>
                  Available now
                </Chip>
                <Chip selected={!values.availableNow} onClick={() => set("availableNow", false)}>
                  Pick a date
                </Chip>
              </div>
              {values.availableNow ? null : (
                <input
                  type="date"
                  aria-label="Available from date"
                  value={values.availableFrom}
                  min={today}
                  max={latestAvailableFrom(today)}
                  onChange={(event) => set("availableFrom", event.target.value)}
                  className={INPUT}
                />
              )}
            </Field>
          </Section>

          <Section title="Who it suits">
            <Field label="Preference" sparkle={fills.shows("preference", values.preference)} error={errors.preference}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Preference">
                {preferences.map((preference) => (
                  <Chip
                    key={preference}
                    selected={values.preference === preference}
                    onClick={() => set("preference", preference)}
                  >
                    {PREFERENCE_LABEL[preference]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Included (optional)" sparkle={fills.shows("included", values.included)}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Included">
                {INCLUDED_ITEMS.map((item) => (
                  <Chip
                    key={item}
                    selected={values.included.includes(item)}
                    onClick={() => set("included", toggleIncluded(values.included, item))}
                  >
                    {INCLUDED_LABEL[item]}
                  </Chip>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Details">
            <Field
              label="Description" sparkle={fills.shows("description", values.description)}
              htmlFor="op-description"
              error={errors.description}
              hint={`${values.description.length}/${MAX_DESCRIPTION}`}
            >
              <textarea
                id="op-description"
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
                rows={5}
                maxLength={MAX_DESCRIPTION + 50}
                placeholder="Tell neighbours about the flat, the people, house rules"
                className={cn(INPUT, "h-auto resize-y py-3")}
              />
            </Field>
            <Field label="How should neighbours contact you?">
              <div className="flex gap-2" role="group" aria-label="Contact method">
                {(["whatsapp", "call"] as OpeningContactMethod[]).map((method) => (
                  <Chip
                    key={method}
                    selected={values.contactMethod === method}
                    onClick={() => set("contactMethod", method)}
                  >
                    {method === "whatsapp" ? "WhatsApp" : "Call"}
                  </Chip>
                ))}
              </div>
            </Field>
            {needsPhone ? (
              <Field
                label="Your phone number"
                htmlFor="op-phone"
                error={errors.phone}
                hint="Only used for the contact button. It is never shown to anyone."
              >
                <input
                  id="op-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder="98765 43210"
                  className={INPUT}
                />
              </Field>
            ) : null}
          </Section>

          <p className="text-callout text-ink-secondary">
            It goes live straight away and stays up for 30 days. We will remind you before it ends.
          </p>
          {submitError ? (
            <p role="alert" className="text-callout text-status-red">
              {submitError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {opening ? "Save changes" : "Post opening"}
            </Button>
            <Link
              href={opening ? `/flat-openings/${opening.id}` : "/flat-openings"}
              className={buttonVariants({ variant: "secondary" })}
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:w-[360px] lg:shrink-0" aria-label="Preview">
          <p className="mb-3 text-callout font-semibold text-ink-secondary">Preview</p>
          <OpeningCard opening={previewOpening(values, options)} preview />
        </aside>
      </div>
    </form>
  );
}
