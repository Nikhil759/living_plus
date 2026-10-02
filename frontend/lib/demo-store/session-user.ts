import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface DemoSessionUser {
  id: string;
  email?: string | null;
  name: string;
  avatarUrl?: string;
}

export async function getDemoSessionUser(): Promise<DemoSessionUser | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const avatar =
    typeof meta?.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta?.picture === "string"
        ? meta.picture
        : undefined;

  let name = user.email?.split("@")[0] ?? "Resident";
  if (meta) {
    const full = meta.full_name ?? meta.name;
    if (typeof full === "string" && full.trim()) name = full.trim();
  }

  return { id: user.id, email: user.email, name, avatarUrl: avatar };
}
