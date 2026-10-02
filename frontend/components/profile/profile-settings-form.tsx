"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchCurrentResident, patchDemoResidentClient } from "@/lib/api/user-client";
import { ApiError } from "@/lib/api/client";
import type { Resident } from "@/lib/types/home";
import { ProfileLogoutButton } from "@/components/auth/profile-logout-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InterestPicker } from "@/components/profile/interest-picker";

const inputClassName =
  "w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2";

interface ProfileSettingsFormProps {
  initial: Pick<Resident, "bio" | "interests" | "isVisible" | "showFlat">;
  backend: "demo" | "api";
}

export function ProfileSettingsForm({ initial, backend }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [bio, setBio] = useState(initial.bio ?? "");
  const [interests, setInterests] = useState<string[]>(initial.interests ?? []);
  const [isVisible, setIsVisible] = useState(initial.isVisible ?? false);
  const [showFlat, setShowFlat] = useState(initial.showFlat ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        bio: bio.trim() || null,
        interests,
        isVisible,
        showFlat,
      };
      if (backend === "demo") {
        await patchDemoResidentClient(payload);
      } else {
        await patchCurrentResident(payload);
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-title text-ink">Privacy & interests</h2>
        <p className="mt-1 text-caption text-ink-tertiary">
          Opt in to appear in neighbour matches. Flat number stays hidden unless you choose to
          show it.
        </p>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Bio</span>
          <textarea
            className={`${inputClassName} min-h-[88px] resize-y`}
            maxLength={2000}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line or two about you"
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-caption font-medium text-ink-secondary">Interests</span>
          <InterestPicker value={interests} onChange={setInterests} />
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-outline-variant"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
          />
          <span className="text-body text-ink-secondary">
            Show my profile to neighbours for interest matching
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-outline-variant"
            checked={showFlat}
            onChange={(e) => setShowFlat(e.target.checked)}
          />
          <span className="text-body text-ink-secondary">Show my flat number on my profile</span>
        </label>
        {error ? (
          <p className="text-caption text-status-red" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? <p className="text-caption text-primary">Saved.</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/30 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <ProfileLogoutButton className="sm:order-1" />
          <Button
            type="submit"
            size="sm"
            className="w-full sm:order-2 sm:w-auto sm:min-w-[9.5rem]"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
