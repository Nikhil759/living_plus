"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  createEventApi,
  createEventDemo,
  updateEventApi,
  uploadEventCoverApi,
} from "@/lib/api/events-client";
import { EventCover } from "@/components/events/event-cover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { approvalExplain, hostSubmitLabel } from "@/lib/events/approval";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "@/lib/events/categories";
import {
  addHoursToLocalInput,
  eventFormDefaults,
  eventFormPayload,
  parseTagList,
  type EventFormValues,
} from "@/lib/events/form";
import {
  VENUE_OTHER,
  buildVenueOptions,
  presetVenueSelection,
  resolveVenue,
  venueAmenityId,
  venueLocation,
  type VenueOption,
} from "@/lib/events/venues";
import type { EventCategory, EventRecurrence, EventType, HomeEvent } from "@/lib/types/home";

const VENUE_GROUPS = { flat: "At home", society: "Around the society" };
const DEFAULT_VENUE_OPTIONS = buildVenueOptions();

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Every month" },
];

const REPEAT_COUNT_OPTIONS = Array.from({ length: 11 }, (_, index) => {
  const count = String(index + 2);
  return { value: count, label: `${count} occurrences` };
});

const CATEGORY_OPTIONS = EVENT_CATEGORIES.map((id) => ({
  value: id,
  label: EVENT_CATEGORY_LABEL[id],
}));

const inputClassName =
  "w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2";

const EVENT_TYPES: EventType[] = ["free", "paid", "society"];

interface HostEventFormProps {
  backend: "demo" | "api";
  event?: HomeEvent;
  isCommittee?: boolean;
  venueOptions?: VenueOption[];
  /** Venue name from a "Host an event here" link. */
  presetVenue?: string;
  /** Values from a Saarthi card's Edit (new events only). */
  prefill?: Partial<EventFormValues>;
}

export function HostEventForm({
  backend,
  event,
  isCommittee = false,
  venueOptions = DEFAULT_VENUE_OPTIONS,
  presetVenue,
  prefill,
}: HostEventFormProps) {
  const router = useRouter();
  const initial = { ...eventFormDefaults(event), ...prefill };
  const initialVenue =
    event || prefill?.locationLabel
      ? resolveVenue(initial.locationLabel, venueOptions)
      : presetVenueSelection(presetVenue, venueOptions);
  const [venueKey, setVenueKey] = useState(initialVenue.key);
  const [venueOther, setVenueOther] = useState(initialVenue.other);
  const [locationInvalid, setLocationInvalid] = useState(false);
  const [eventType, setEventType] = useState<EventType>(initial.eventType);
  const [priceInr, setPriceInr] = useState(String(initial.priceInr));
  const [recurrence, setRecurrence] = useState<EventRecurrence>(initial.recurrence);
  const [recurrenceCount, setRecurrenceCount] = useState(String(initial.recurrenceCount));
  const [stallsEnabled, setStallsEnabled] = useState(initial.stallsEnabled);
  const [stallCount, setStallCount] = useState(String(initial.stallCount));
  const [stallFeeInr, setStallFeeInr] = useState(String(initial.stallFeeInr));
  const [stallCategoriesText, setStallCategoriesText] = useState(initial.stallCategoriesText);
  const [stallDeadline, setStallDeadline] = useState(initial.stallDeadline);
  const [title, setTitle] = useState(initial.title);
  const [startsAtLocal, setStartsAtLocal] = useState(initial.startsAt);
  const [endsAtLocal, setEndsAtLocal] = useState(initial.endsAt);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState<EventCategory>(initial.category);
  const [capacity, setCapacity] = useState(String(initial.capacity));
  const [guestLimit, setGuestLimit] = useState(String(initial.guestLimit));
  const [whatToBring, setWhatToBring] = useState(initial.whatToBring);
  const [inviteInterest, setInviteInterest] = useState(initial.inviteInterest);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isEdit = Boolean(event);
  const isDraft = (event?.status ?? "published") === "draft";
  const canDraft = backend === "api" && (!isEdit || isDraft);

  function clearCover() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setCoverUrl("");
  }

  async function onPickCover(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Cover must be a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be 5 MB or smaller.");
      return;
    }
    if (backend === "demo") {
      setError("Photo upload is only available on the API.");
      return;
    }
    const local = URL.createObjectURL(file);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(local);
    setUploading(true);
    setError(null);
    try {
      const url = await uploadEventCoverApi(file);
      setCoverUrl(url);
      setPreviewUrl(undefined);
      URL.revokeObjectURL(local);
    } catch (err) {
      setCoverUrl("");
      setPreviewUrl(undefined);
      URL.revokeObjectURL(local);
      setError(err instanceof ApiError ? err.message : "Could not upload cover.");
    } finally {
      setUploading(false);
    }
  }

  const location = venueLocation({ key: venueKey, other: venueOther }, venueOptions);

  function values() {
    return {
      title,
      locationLabel: location,
      startsAt: startsAtLocal,
      endsAt: endsAtLocal,
      description,
      category,
      capacity: Math.max(1, Number(capacity) || 50),
      guestLimit: Math.min(10, Math.max(0, Number(guestLimit) || 0)),
      whatToBring,
      inviteInterest: event ? "" : inviteInterest,
      coverUrl,
      tags: parseTagList(tagsText),
      eventType,
      priceInr: Math.min(10_000, Math.max(50, Number(priceInr) || 250)),
      recurrence,
      recurrenceCount: Math.min(12, Math.max(2, Number(recurrenceCount) || 4)),
      stallsEnabled,
      stallCount: Math.min(80, Math.max(1, Number(stallCount) || 10)),
      stallFeeInr: Math.min(10_000, Math.max(0, Number(stallFeeInr) || 0)),
      stallCategoriesText,
      stallDeadline,
    };
  }

  async function submit(mode: "draft" | "publish") {
    if (!location) {
      setLocationInvalid(true);
      setError(
        venueKey === VENUE_OTHER ? "Type where the event will be." : "Pick where the event will be.",
      );
      return;
    }
    setPending(mode);
    setError(null);
    try {
      let saved: HomeEvent;
      if (backend === "demo") {
        saved = await createEventDemo({
          title,
          location,
          startsAt: new Date(startsAtLocal).toISOString(),
          tags: parseTagList(tagsText),
        });
      } else if (event) {
        saved = await updateEventApi(
          event.id,
          eventFormPayload(values(), { publish: mode === "publish" && isDraft }),
        );
      } else {
        saved = await createEventApi(
          eventFormPayload(values(), {
            saveAsDraft: mode === "draft",
            amenityId: venueAmenityId({ key: venueKey, other: venueOther }, venueOptions),
          }),
        );
      }
      router.push(saved.href);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save event.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-content space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-title text-ink">{isEdit ? "Edit event" : "Host an event"}</h2>
        <p className="mt-1 text-caption text-ink-tertiary">
          {approvalExplain(eventType) ?? "Free events go live as soon as you publish."}
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("publish");
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-caption font-medium text-ink-secondary">Type</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => {
              const locked = Boolean(event);
              const disabled = locked || (type === "society" && !isCommittee);
              const title =
                type === "society" && !isCommittee
                  ? "Only the committee can host society events"
                  : type === "paid"
                    ? "Plus feature · unlocked in demo"
                    : undefined;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  title={title}
                  onClick={() => setEventType(type)}
                  className={`${buttonVariants({
                    variant: eventType === type ? "primary" : "secondary",
                    size: "sm",
                  })} disabled:opacity-40`}
                >
                  {EVENT_TYPE_LABEL[type]}
                  {type === "paid" ? " · Plus" : null}
                </button>
              );
            })}
          </div>
        </fieldset>
        {eventType === "society" ? (
          <fieldset className="space-y-3">
            <legend className="text-caption font-medium text-ink-secondary">Stalls</legend>
            <label className="flex items-center gap-2 text-callout text-ink">
              <input
                type="checkbox"
                checked={stallsEnabled}
                onChange={(e) => setStallsEnabled(e.target.checked)}
              />
              Take stall applications
            </label>
            {stallsEnabled ? (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-caption font-medium text-ink-secondary">Number of stalls</span>
                    <input
                      className={inputClassName}
                      type="number"
                      min={1}
                      max={80}
                      value={stallCount}
                      onChange={(e) => setStallCount(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-caption font-medium text-ink-secondary">Stall fee (₹)</span>
                    <input
                      className={inputClassName}
                      type="number"
                      min={0}
                      max={10000}
                      step={50}
                      value={stallFeeInr}
                      onChange={(e) => setStallFeeInr(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium text-ink-secondary">Types and limits</span>
                  <input
                    className={inputClassName}
                    value={stallCategoriesText}
                    onChange={(e) => setStallCategoriesText(e.target.value)}
                    placeholder="Chaat:2, Handicraft, Games:3"
                  />
                  <p className="text-caption text-ink-tertiary">
                    Comma-separated. Add :2 after a type to cap how many of that stall you will take.
                  </p>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium text-ink-secondary">Application deadline</span>
                  <input
                    className={inputClassName}
                    type="datetime-local"
                    value={stallDeadline}
                    onChange={(e) => setStallDeadline(e.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </fieldset>
        ) : null}
        {eventType === "paid" ? (
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">Ticket price (₹)</span>
            <input
              className={inputClassName}
              type="number"
              min={50}
              max={10000}
              step={50}
              required
              value={priceInr}
              onChange={(e) => setPriceInr(e.target.value)}
            />
            <p className="text-caption text-ink-tertiary">
              Refunds only if you or the committee cancel the event.
            </p>
          </label>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Title</span>
          <input
            className={inputClassName}
            required
            minLength={3}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday morning walk"
          />
        </label>
        <div className="space-y-1.5">
          <span className="block text-caption font-medium text-ink-secondary">Location</span>
          <Select
            aria-label="Location"
            value={venueKey}
            invalid={locationInvalid && !location}
            placeholder="Choose a place"
            options={venueOptions}
            groupLabels={VENUE_GROUPS}
            onChange={(next) => {
              setVenueKey(next);
              setLocationInvalid(false);
              setError(null);
            }}
          />
          {venueKey === VENUE_OTHER ? (
            <input
              className={inputClassName}
              autoFocus
              maxLength={200}
              value={venueOther}
              aria-label="Other location"
              onChange={(e) => {
                setVenueOther(e.target.value);
                setLocationInvalid(false);
              }}
              placeholder="e.g. Central lawn, Tower B lobby"
            />
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">Starts</span>
            <input
              type="datetime-local"
              className={inputClassName}
              required
              value={startsAtLocal}
              onChange={(e) => {
                const next = e.target.value;
                setStartsAtLocal(next);
                if (new Date(endsAtLocal) <= new Date(next)) {
                  setEndsAtLocal(addHoursToLocalInput(next, 2));
                }
              }}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">Ends</span>
            <input
              type="datetime-local"
              className={inputClassName}
              required
              value={endsAtLocal}
              onChange={(e) => setEndsAtLocal(e.target.value)}
            />
          </label>
        </div>
        {isEdit ? (
          event?.seriesId ? (
            <p className="text-caption text-ink-tertiary">
              This is one date in a series. Changes apply to this occurrence only.
            </p>
          ) : null
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="block text-caption font-medium text-ink-secondary">Repeat</span>
              <Select
                aria-label="Repeat"
                value={recurrence}
                options={RECURRENCE_OPTIONS}
                onChange={(next) => setRecurrence(next as EventRecurrence)}
              />
            </div>
            {recurrence !== "none" ? (
              <div className="space-y-1.5">
                <span className="block text-caption font-medium text-ink-secondary">Ends after</span>
                <Select
                  aria-label="Ends after"
                  value={recurrenceCount}
                  options={REPEAT_COUNT_OPTIONS}
                  onChange={setRecurrenceCount}
                />
              </div>
            ) : null}
          </div>
        )}
        <div className="space-y-1.5">
          <span className="block text-caption font-medium text-ink-secondary">Category</span>
          <Select
            aria-label="Category"
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={(next) => setCategory(next as EventCategory)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">Capacity</span>
            <input
              type="number"
              className={inputClassName}
              min={1}
              max={2000}
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">Guests per resident</span>
            <input
              type="number"
              className={inputClassName}
              min={0}
              max={10}
              value={guestLimit}
              onChange={(e) => setGuestLimit(e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">About</span>
          <textarea
            className={`${inputClassName} min-h-28 resize-y`}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will people do, and who is it for?"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">What to bring</span>
          <input
            className={inputClassName}
            maxLength={500}
            value={whatToBring}
            onChange={(e) => setWhatToBring(e.target.value)}
            placeholder="A mat and water"
          />
        </label>
        {!event ? (
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">
              Invite residents interested in (optional)
            </span>
            <input
              className={inputClassName}
              maxLength={40}
              value={inviteInterest}
              onChange={(e) => setInviteInterest(e.target.value)}
              placeholder="football"
            />
            <span className="block text-caption text-ink-tertiary">
              They get an invite once the event is published. Inviting more than 10 residents
              needs committee approval.
            </span>
          </label>
        ) : null}
        <div className="space-y-2">
          <span className="text-caption font-medium text-ink-secondary">Cover photo</span>
          <div className="overflow-hidden rounded-card">
            <EventCover
              title={title || "Event cover"}
              imageUrl={previewUrl || coverUrl || undefined}
              category={category}
              sizes="(max-width: 768px) 100vw, 720px"
              frame="card"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={buttonVariants({
                variant: "secondary",
                size: "sm",
                className: uploading || pending ? "pointer-events-none opacity-40" : undefined,
              })}
            >
              {uploading ? "Uploading…" : coverUrl ? "Replace photo" : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading || pending !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void onPickCover(file);
                }}
              />
            </label>
            {coverUrl ? (
              <button
                type="button"
                className="text-callout font-semibold text-ink-secondary hover:text-ink"
                disabled={uploading || pending !== null}
                onClick={clearCover}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-caption text-ink-tertiary">JPEG, PNG or WebP · up to 5 MB</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Tags (optional)</span>
          <input
            className={inputClassName}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="walking, wellness"
          />
        </label>
        {error ? <p className="text-caption text-error">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          {canDraft ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending !== null || uploading}
              onClick={() => void submit("draft")}
            >
              {pending === "draft" ? "Saving…" : "Save draft"}
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={pending !== null || uploading}>
            {pending === "publish" ? "Saving…" : hostSubmitLabel(event, eventType)}
          </Button>
        </div>
      </form>
    </Card>
  );
}
