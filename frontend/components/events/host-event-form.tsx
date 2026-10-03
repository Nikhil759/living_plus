"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { createEventApi, createEventDemo, updateEventApi } from "@/lib/api/events-client";
import { EventCover } from "@/components/events/event-cover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL } from "@/lib/events/categories";
import {
  addHoursToLocalInput,
  eventFormDefaults,
  eventFormPayload,
  parseTagList,
} from "@/lib/events/form";
import type { EventCategory, HomeEvent } from "@/lib/types/home";

const inputClassName =
  "w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2";

interface HostEventFormProps {
  backend: "demo" | "api";
  event?: HomeEvent;
}

export function HostEventForm({ backend, event }: HostEventFormProps) {
  const router = useRouter();
  const initial = eventFormDefaults(event);
  const [title, setTitle] = useState(initial.title);
  const [location, setLocation] = useState(initial.locationLabel);
  const [startsAtLocal, setStartsAtLocal] = useState(initial.startsAt);
  const [endsAtLocal, setEndsAtLocal] = useState(initial.endsAt);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState<EventCategory>(initial.category);
  const [capacity, setCapacity] = useState(String(initial.capacity));
  const [guestLimit, setGuestLimit] = useState(String(initial.guestLimit));
  const [whatToBring, setWhatToBring] = useState(initial.whatToBring);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(event);
  const isDraft = (event?.status ?? "published") === "draft";
  const canDraft = backend === "api" && (!isEdit || isDraft);

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
      coverUrl,
      tags: parseTagList(tagsText),
    };
  }

  async function submit(mode: "draft" | "publish") {
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
        saved = await createEventApi(eventFormPayload(values(), { saveAsDraft: mode === "draft" }));
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
        <h2 className="text-title text-ink">{isEdit ? "Edit event" : "Free community event"}</h2>
        <p className="mt-1 text-caption text-ink-tertiary">
          Paid and society-wide events still need committee approval — coming soon.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("publish");
        }}
      >
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
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Location</span>
          <input
            className={inputClassName}
            required
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Central park gate"
          />
        </label>
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
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Category</span>
          <select
            className={inputClassName}
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
          >
            {EVENT_CATEGORIES.map((id) => (
              <option key={id} value={id}>
                {EVENT_CATEGORY_LABEL[id]}
              </option>
            ))}
          </select>
        </label>
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
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Cover image URL</span>
          <input
            className={inputClassName}
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://images.unsplash.com/…"
          />
        </label>
        <div className="overflow-hidden rounded-card">
          <EventCover
            title={title || "Event cover"}
            imageUrl={coverUrl || undefined}
            category={category}
            sizes="(max-width: 768px) 100vw, 720px"
            frame="card"
          />
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
              disabled={pending !== null}
              onClick={() => void submit("draft")}
            >
              {pending === "draft" ? "Saving…" : "Save draft"}
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={pending !== null}>
            {pending === "publish"
              ? "Saving…"
              : isEdit && !isDraft
                ? "Save changes"
                : "Publish event"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
