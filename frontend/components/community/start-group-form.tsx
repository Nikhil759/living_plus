"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createGroupApi } from "@/lib/api/community-client";
import type { GroupVisibility } from "@/lib/types/community";

const field = "w-full rounded-tile border border-outline-variant/40 p-2.5 text-body";

export function StartGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const group = await createGroupApi({
        name,
        emoji: emoji.trim() || "👥",
        description,
        visibility,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      });
      router.push(`/community/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex gap-3">
          <label className="block w-20 space-y-1">
            <span className="text-callout font-medium text-ink">Emoji</span>
            <input className={field} maxLength={8} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </label>
          <label className="block flex-1 space-y-1">
            <span className="text-callout font-medium text-ink">Group name</span>
            <input
              className={field}
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Cyclists"
              required
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">What is it about?</span>
          <textarea
            className={field}
            rows={3}
            minLength={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">Interests (comma separated)</span>
          <input
            className={field}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="cycling, running"
          />
          <span className="text-caption text-ink-tertiary">
            Neighbours with these interests will see it as a suggestion.
          </span>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-callout font-medium text-ink">Who can join</legend>
          <label className="flex items-center gap-2 text-body">
            <input type="radio" name="visibility" checked={visibility === "public"} onChange={() => setVisibility("public")} />
            Anyone in the society
          </label>
          <label className="flex items-center gap-2 text-body">
            <input type="radio" name="visibility" checked={visibility === "private"} onChange={() => setVisibility("private")} />
            Private: you approve requests
          </label>
        </fieldset>
      </Card>
      {error ? <p className="text-callout text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy || name.trim().length < 3 || description.trim().length < 3}>
        Start group
      </Button>
    </form>
  );
}
