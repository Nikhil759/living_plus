"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchCurrentResident, patchDemoResidentClient } from "@/lib/api/user-client";
import { ApiError } from "@/lib/api/client";

export function ProfilePrivacySwitches({
  backend,
  initialVisible,
  initialShowFlat,
}: {
  backend: "demo" | "api";
  initialVisible: boolean;
  initialShowFlat: boolean;
}) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [showFlat, setShowFlat] = useState(initialShowFlat);
  const [busy, setBusy] = useState(false);

  async function save(patch: { isVisible?: boolean; showFlat?: boolean }) {
    setBusy(true);
    try {
      const payload = {
        isVisible: patch.isVisible ?? isVisible,
        showFlat: patch.showFlat ?? showFlat,
      };
      if (backend === "demo") {
        await patchDemoResidentClient(payload);
      } else {
        await patchCurrentResident(payload);
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        // revert on failure
        if (patch.isVisible !== undefined) setIsVisible(initialVisible);
        if (patch.showFlat !== undefined) setShowFlat(initialShowFlat);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-outline-variant/30 pt-4">
      <p className="text-caption font-medium text-ink-secondary">Privacy</p>
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-callout font-medium text-ink">Show me to neighbours</span>
          <span className="text-caption text-ink-tertiary">
            Appear in People and interest matches when your profile is visible.
          </span>
        </span>
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-primary"
          checked={isVisible}
          disabled={busy}
          onChange={(e) => {
            setIsVisible(e.target.checked);
            void save({ isVisible: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-callout font-medium text-ink">Show my flat number</span>
          <span className="text-caption text-ink-tertiary">
            Display your flat on your profile; tower stays visible either way.
          </span>
        </span>
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-primary"
          checked={showFlat}
          disabled={busy}
          onChange={(e) => {
            setShowFlat(e.target.checked);
            void save({ showFlat: e.target.checked });
          }}
        />
      </label>
    </div>
  );
}
