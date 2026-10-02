import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfigOptional } from "@/lib/supabase/env";

export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfigOptional();
  if (!config) return null;
  const { url, key } = config;
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Called from a Server Component — middleware can refresh the session. */
        }
      },
    },
  });
}
