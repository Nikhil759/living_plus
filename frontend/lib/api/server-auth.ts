import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";

export async function getServerAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function apiGetAsUser<T>(path: string): Promise<T> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError("Missing access token.", 401, "unauthorised");
  }
  return apiGet<T>(path, { headers: authHeaders(token) });
}

export async function apiPostAsUser<T>(path: string, body: unknown): Promise<T> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError("Missing access token.", 401, "unauthorised");
  }
  return apiPost<T>(path, body, { headers: authHeaders(token) });
}
