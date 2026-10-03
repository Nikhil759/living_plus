"use client";

import { ApiError } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function getBrowserAccessToken(): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new ApiError("Missing access token.", 401, "unauthorised");
  }
  return token;
}
