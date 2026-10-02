import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const { url, key } = getSupabaseBrowserConfig();
  return createBrowserClient(url, key);
}
