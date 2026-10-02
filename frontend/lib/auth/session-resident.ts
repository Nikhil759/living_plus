import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Resident } from "@/lib/types/home";

function displayNameFromMetadata(meta: Record<string, unknown> | undefined, email: string | undefined): string {
  if (meta) {
    const full = meta.full_name ?? meta.name;
    if (typeof full === "string" && full.trim()) return full.trim();
  }
  if (email?.includes("@")) {
    const local = email.split("@")[0]?.replace(/[._+]/g, " ").trim();
    if (local) {
      return local
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    }
  }
  return "Resident";
}

/** Minimal resident for shell when API is unavailable but Supabase session exists. */
export async function loadSessionResidentFallback(): Promise<Resident | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const avatar =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : undefined;

  return {
    id: user.id,
    name: displayNameFromMetadata(user.user_metadata as Record<string, unknown>, user.email),
    avatarUrl: avatar,
    society: "Your society",
    tower: "—",
    flat: "—",
    roles: [],
    hasUnreadNotifications: false,
  };
}
