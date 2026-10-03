"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListingCard } from "@/components/marketplace/listing-card";
import { ListingPhotoPicker } from "@/components/marketplace/listing-photo-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { createListingApi, updateListingApi } from "@/lib/api/marketplace-client";
import {
  emptyListingForm,
  listingFormFrom,
  listingPayload,
  MAX_DESCRIPTION,
  MAX_TITLE,
  validateListingForm,
  type ListingFormErrors,
  type ListingFormField,
  type ListingFormValues,
} from "@/lib/marketplace/form";
import {
  LISTING_CATEGORIES,
  LISTING_CATEGORY_LABEL,
  LISTING_CONDITIONS,
  LISTING_CONDITION_LABEL,
} from "@/lib/marketplace/view";
import { cn } from "@/lib/utils";
import type {
  ListingCategory,
  ListingCondition,
  MarketplaceCard,
  MarketplaceListing,
  SellerProfile,
} from "@/lib/types/marketplace";

const CATEGORY_OPTIONS = LISTING_CATEGORIES.map((id) => ({ value: id, label: LISTING_CATEGORY_LABEL[id] }));
export const INPUT =
  "h-11 w-full rounded-tile bg-quiet px-4 text-body text-ink placeholder:text-ink-tertiary outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
export const CHIP = "rounded-full px-3.5 py-1.5 text-callout transition-colors duration-premium ease-premium";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-callout font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-caption text-ink-tertiary">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Tick({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex items-center gap-2.5 text-body text-ink", disabled && "opacity-40")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[var(--primary)]"
      />
      {children}
    </label>
  );
}

/** Preview card built from what has been typed so far. */
function previewCard(values: ListingFormValues, profile: SellerProfile): MarketplaceCard {
  return {
    id: "preview",
    title: values.title.trim() || "Your item title",
    priceInr: values.isFree ? 0 : Number(values.price) || 0,
    isFree: values.isFree,
    negotiable: values.negotiable,
    condition: values.condition || "good",
    category: values.category || "furniture",
    coverUrl: values.photos[0] ?? null,
    status: "available",
    tower: profile.tower,
    listedAt: new Date().toISOString(),
    isMine: true,
    reported: false,
  };
}

export function ListingForm({ profile, listing }: { profile: SellerProfile; listing?: MarketplaceListing }) {
  const router = useRouter();
  const [values, setValues] = useState<ListingFormValues>(listing ? listingFormFrom(listing) : emptyListingForm());
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsPhone = !profile.hasPhone;
  const isEdit = Boolean(listing);

  function set<K extends ListingFormField>(field: K, value: ListingFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateListingForm(values, { needsPhone });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const body = listingPayload(values);
      const saved = listing ? await updateListingApi(listing.id, body) : await createListingApi(body);
      router.push(`/marketplace/${saved.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save the listing. Please try again.";
      if (err instanceof ApiError && err.code === "phone_required") setErrors({ phone: message });
      else setSubmitError(message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="mx-auto w-full max-w-content">
      <div className="lg:flex lg:items-start lg:justify-center lg:gap-10">
        <div className="min-w-0 space-y-6 lg:max-w-[640px] lg:flex-1">
          <Field label="Photos">
            <ListingPhotoPicker
              photos={values.photos}
              category={values.category || "furniture"}
              onChange={(photos) => set("photos", photos)}
              error={errors.photos}
            />
          </Field>

          <Field label="Title" htmlFor="listing-title" error={errors.title} hint={`${values.title.length}/${MAX_TITLE}`}>
            <input
              id="listing-title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              maxLength={MAX_TITLE + 20}
              placeholder="e.g. Yoga mat, 6mm"
              className={INPUT}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Category" htmlFor="listing-category" error={errors.category}>
              <Select
                id="listing-category"
                value={values.category}
                placeholder="Choose a category"
                invalid={Boolean(errors.category)}
                onChange={(value) => set("category", value as ListingCategory)}
                options={CATEGORY_OPTIONS}
              />
            </Field>
            <Field label="Condition" error={errors.condition}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Condition">
                {LISTING_CONDITIONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={values.condition === id}
                    onClick={() => set("condition", id as ListingCondition)}
                    className={cn(CHIP, values.condition === id ? "bg-primary text-white" : "bg-quiet text-ink-secondary")}
                  >
                    {LISTING_CONDITION_LABEL[id]}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Price" htmlFor="listing-price" error={errors.price}>
            <div className="space-y-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-ink-secondary">₹</span>
                <input
                  id="listing-price"
                  inputMode="numeric"
                  value={values.isFree ? "" : values.price}
                  disabled={values.isFree}
                  onChange={(event) => set("price", event.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="0"
                  className={cn(INPUT, "pl-8 disabled:opacity-40")}
                />
              </div>
              <Tick
                checked={values.isFree}
                onChange={(free) => {
                  set("isFree", free);
                  if (free) set("negotiable", false);
                }}
              >
                Giving it away for free
              </Tick>
              <Tick checked={values.negotiable} disabled={values.isFree} onChange={(value) => set("negotiable", value)}>
                Price negotiable
              </Tick>
            </div>
          </Field>

          <Field
            label="Description (optional)"
            htmlFor="listing-description"
            error={errors.description}
            hint={`${values.description.length}/${MAX_DESCRIPTION}`}
          >
            <textarea
              id="listing-description"
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              rows={4}
              maxLength={MAX_DESCRIPTION + 50}
              placeholder="Age, condition, what's included"
              className={cn(INPUT, "h-auto resize-y py-3")}
            />
          </Field>

          <Field label="How should buyers contact you?">
            <div className="flex gap-2" role="group" aria-label="Contact method">
              {(["whatsapp", "call"] as const).map((method) => (
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
              htmlFor="listing-phone"
              error={errors.phone}
              hint="Only used for the Contact seller button. It is never shown to anyone."
            >
              <input
                id="listing-phone"
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

          <Field label="Pickup note" htmlFor="listing-pickup" error={errors.pickupNote}>
            <input
              id="listing-pickup"
              value={values.pickupNote}
              onChange={(event) => set("pickupNote", event.target.value)}
              maxLength={120}
              className={INPUT}
            />
          </Field>

          {submitError ? (
            <p role="alert" className="text-callout text-status-red">
              {submitError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {isEdit ? "Save changes" : "Publish listing"}
            </Button>
            <Link
              href={listing ? `/marketplace/${listing.id}` : "/marketplace"}
              className={buttonVariants({ variant: "secondary" })}
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:w-[260px] lg:shrink-0" aria-label="Preview">
          <p className="mb-3 text-callout font-semibold text-ink-secondary">Preview</p>
          <ListingCard listing={previewCard(values, profile)} preview />
        </aside>
      </div>
    </form>
  );
}
