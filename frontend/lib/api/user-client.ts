"use client";

import { apiPatch, ApiError } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ProfilePatch, Resident } from "@/lib/types/home";

async function getBrowserAccessToken(): Promise<string> {
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

export async function patchCurrentResident(body: ProfilePatch): Promise<Resident> {
  const token = await getBrowserAccessToken();
  return apiPatch<Resident>("/v1/me", body, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Same-origin demo store (SQLite); session cookie auth. */
export async function patchDemoResidentClient(body: ProfilePatch): Promise<Resident> {
  return apiPatch<Resident>("/api/demo/resident", body);
}
