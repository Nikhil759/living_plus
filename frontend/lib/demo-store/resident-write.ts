import { getDemoDb } from "@/lib/demo-store/db";
import { demoGetDefaultResident, demoGetResidentForUser } from "@/lib/demo-store/readers";
import type { ProfilePatch, Resident } from "@/lib/types/home";

export function patchDemoResident(userId: string, patch: ProfilePatch): Resident {
  const db = getDemoDb();
  const base = demoGetResidentForUser(userId);
  const updated: Resident = {
    ...base,
    bio: patch.bio !== undefined ? patch.bio : base.bio,
    interests: patch.interests !== undefined ? patch.interests : base.interests,
    isVisible: patch.isVisible !== undefined ? patch.isVisible : base.isVisible,
    showFlat: patch.showFlat !== undefined ? patch.showFlat : base.showFlat,
  };

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO demo_resident (user_id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
  ).run(userId, JSON.stringify(updated), now);

  return updated;
}

export function mergeSessionIntoResident(
  resident: Resident,
  session: { id: string; email?: string | null; name?: string; avatarUrl?: string },
): Resident {
  return {
    ...resident,
    id: session.id,
    name: session.name || resident.name,
    avatarUrl: session.avatarUrl ?? resident.avatarUrl,
  };
}

export function demoHomeResidentForUser(userId: string | null): Resident {
  const resident = userId ? demoGetResidentForUser(userId) : demoGetDefaultResident();
  return resident;
}
