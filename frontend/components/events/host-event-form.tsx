"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { createEventApi, createEventDemo } from "@/lib/api/events-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const inputClassName =
  "w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2";

interface HostEventFormProps {
  backend: "demo" | "api";
}

function defaultStartsAtLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function HostEventForm({ backend }: HostEventFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(defaultStartsAtLocal);
  const [tagsText, setTagsText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const startsAt = new Date(startsAtLocal).toISOString();
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      let created;
      if (backend === "demo") {
        created = await createEventDemo({ title, location, startsAt, tags });
      } else {
        created = await createEventApi({
          title,
          locationLabel: location,
          startsAt,
          tags,
        });
      }
      router.push(created.href);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create event.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-title text-ink">Free community event</h2>
        <p className="mt-1 text-caption text-ink-tertiary">
          Paid and society-wide events still need committee approval — coming soon.
        </p>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
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
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Starts</span>
          <input
            type="datetime-local"
            className={inputClassName}
            required
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
          />
        </label>
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
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Publishing…" : "Publish event"}
        </Button>
      </form>
    </Card>
  );
}
