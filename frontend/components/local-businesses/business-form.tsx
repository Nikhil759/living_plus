"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusinessCard } from "@/components/local-businesses/business-card";
import { OfferingsEditor } from "@/components/local-businesses/offerings-editor";
import { CHIP, Field, INPUT } from "@/components/marketplace/listing-form";
import { ListingPhotoPicker } from "@/components/marketplace/listing-photo-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  createBusinessApi,
  updateBusinessApi,
  uploadBusinessPhotoApi,
} from "@/lib/api/local-businesses-client";
import {
  businessFormFrom,
  businessPayload,
  emptyBusinessForm,
  MAX_ABOUT,
  MAX_GALLERY,
  MAX_NAME,
  MAX_TAGLINE,
  MAX_TIMINGS,
  previewBusinessCard,
  toggleDay,
  validateBusinessForm,
  type BusinessFormErrors,
  type BusinessFormField,
  type BusinessFormValues,
} from "@/lib/local-businesses/form";
import { businessIconFor } from "@/lib/local-businesses/icons";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABEL,
  SERVES_LABEL,
  WEEKDAY_LABEL,
  WEEKDAYS,
} from "@/lib/local-businesses/view";
import { cn } from "@/lib/utils";
import type {
  BusinessCategory,
  BusinessContactMethod,
  BusinessDetail,
  BusinessServes,
} from "@/lib/types/local-business";
import type { SellerProfile } from "@/lib/types/marketplace";

const CATEGORY_OPTIONS = BUSINESS_CATEGORIES.map((id) => ({
  value: id,
  label: BUSINESS_CATEGORY_LABEL[id],
}));
const SERVES_OPTIONS = (Object.keys(SERVES_LABEL) as BusinessServes[]).map((id) => ({
  value: id,
  label: SERVES_LABEL[id],
}));

/** One page for listing and editing a business, with a live preview of its directory card. */
export function BusinessForm({
  profile,
  business,
  prefill,
}: {
  /** The viewer, from the Marketplace seller profile: first name, tower and whether a phone is saved. */
  profile: SellerProfile;
  business?: BusinessDetail;
  /** Values from a Saarthi card (new businesses only). */
  prefill?: Partial<BusinessFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<BusinessFormValues>(
    business ? businessFormFrom(business) : { ...emptyBusinessForm(), ...prefill },
  );
  const [errors, setErrors] = useState<BusinessFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsPhone = !profile.hasPhone;
  const resubmitting = business?.reviewStatus === "rejected";
  const icon = businessIconFor(values.category);

  function set<K extends BusinessFormField>(field: K, value: BusinessFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateBusinessForm(values, { needsPhone });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const body = businessPayload(values);
      const saved = business ? await updateBusinessApi(business.id, body) : await createBusinessApi(body);
      router.push(`/local-businesses/${saved.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save your business. Please try again.";
      if (err instanceof ApiError && err.code === "phone_required") setErrors({ phone: message });
      else setSubmitError(message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="mx-auto w-full max-w-content">
      <div className="lg:flex lg:items-start lg:justify-center lg:gap-10">
        <div className="min-w-0 space-y-6 lg:max-w-[640px] lg:flex-1">
          <Field label="Business name" htmlFor="biz-name" error={errors.name} hint={`${values.name.length}/${MAX_NAME}`}>
            <input
              id="biz-name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              maxLength={MAX_NAME + 20}
              placeholder="e.g. Amma's South Indian Tiffin"
              className={INPUT}
            />
          </Field>

          <Field label="Category" htmlFor="biz-category" error={errors.category}>
            <Select
              id="biz-category"
              value={values.category}
              placeholder="Choose a category"
              invalid={Boolean(errors.category)}
              onChange={(value) => set("category", value as BusinessCategory)}
              options={CATEGORY_OPTIONS}
            />
          </Field>

          <Field
            label="Tagline"
            htmlFor="biz-tagline"
            error={errors.tagline}
            hint={`${values.tagline.length}/${MAX_TAGLINE}`}
          >
            <input
              id="biz-tagline"
              value={values.tagline}
              onChange={(event) => set("tagline", event.target.value)}
              maxLength={MAX_TAGLINE + 20}
              placeholder="One line about what you offer"
              className={INPUT}
            />
          </Field>

          <Field label="Cover photo">
            <ListingPhotoPicker
              photos={values.cover}
              icon={icon}
              max={1}
              upload={uploadBusinessPhotoApi}
              coverBadge={false}
              onChange={(cover) => set("cover", cover)}
              error={errors.cover}
            />
          </Field>

          <Field label="More photos (optional)">
            <ListingPhotoPicker
              photos={values.photos}
              icon={icon}
              max={MAX_GALLERY}
              upload={uploadBusinessPhotoApi}
              coverBadge={false}
              onChange={(photos) => set("photos", photos)}
              error={errors.photos}
            />
          </Field>

          <Field
            label="About (optional)"
            htmlFor="biz-about"
            error={errors.about}
            hint={`${values.about.length}/${MAX_ABOUT}`}
          >
            <textarea
              id="biz-about"
              value={values.about}
              onChange={(event) => set("about", event.target.value)}
              rows={5}
              maxLength={MAX_ABOUT + 50}
              placeholder="What you do, how it works, how to order"
              className={cn(INPUT, "h-auto resize-y py-3")}
            />
          </Field>

          <Field label="Offerings" error={errors.offerings}>
            <OfferingsEditor rows={values.offerings} onChange={(rows) => set("offerings", rows)} />
          </Field>

          <Field label="Timings" htmlFor="biz-timings" error={errors.timings} hint={`${values.timings.length}/${MAX_TIMINGS}`}>
            <input
              id="biz-timings"
              value={values.timings}
              onChange={(event) => set("timings", event.target.value)}
              maxLength={MAX_TIMINGS + 20}
              placeholder="e.g. 11 AM to 2 PM"
              className={INPUT}
            />
          </Field>

          <Field label="Days" error={errors.days}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Days">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={values.days.includes(day)}
                  onClick={() => set("days", toggleDay(values.days, day))}
                  className={cn(CHIP, values.days.includes(day) ? "bg-primary text-white" : "bg-quiet text-ink-secondary")}
                >
                  {WEEKDAY_LABEL[day]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Where you serve" htmlFor="biz-serves" error={errors.serves}>
            <Select
              id="biz-serves"
              value={values.serves}
              placeholder="Choose where you serve"
              invalid={Boolean(errors.serves)}
              onChange={(value) => set("serves", value as BusinessServes)}
              options={SERVES_OPTIONS}
            />
          </Field>

          <Field label="How should neighbours contact you?">
            <div className="flex gap-2" role="group" aria-label="Contact method">
              {(["whatsapp", "call"] as const).map((method: BusinessContactMethod) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={values.contactMethod === method}
                  onClick={() => set("contactMethod", method)}
                  className={cn(CHIP, values.contactMethod === method ? "bg-primary text-white" : "bg-quiet text-ink-secondary")}
                >
                  {method === "whatsapp" ? "WhatsApp" : "Call"}
                </button>
              ))}
            </div>
          </Field>

          {needsPhone ? (
            <Field
              label="Your phone number"
              htmlFor="biz-phone"
              error={errors.phone}
              hint="Only used for the contact button. It is never shown to anyone."
            >
              <input
                id="biz-phone"
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

          <p className="text-callout text-ink-secondary">
            The committee reviews new businesses once. It usually approves within a day.
          </p>
          {submitError ? (
            <p role="alert" className="text-callout text-status-red">
              {submitError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {business ? (resubmitting ? "Save and resubmit" : "Save changes") : "Submit for approval"}
            </Button>
            <Link
              href={business ? `/local-businesses/${business.id}` : "/local-businesses"}
              className={buttonVariants({ variant: "secondary" })}
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:w-[340px] lg:shrink-0" aria-label="Preview">
          <p className="mb-3 text-callout font-semibold text-ink-secondary">Preview</p>
          <BusinessCard business={previewBusinessCard(values, profile)} preview />
        </aside>
      </div>
    </form>
  );
}
