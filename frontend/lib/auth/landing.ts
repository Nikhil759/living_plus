import { fetchMembershipStatus, membershipRequiresApi, postAuthPath } from "@/lib/auth/membership";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LandingRoute = "/login" | "/join" | "/home";

export async function resolveLandingRoute(): Promise<LandingRoute> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return "/login";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const path = await postAuthPath(session?.access_token);
  return path;
}

export async function isApprovedMember(accessToken: string | null | undefined): Promise<boolean> {
  if (!accessToken) return false;
  const status = await fetchMembershipStatus(accessToken);
  if (status === "member") return true;
  if (status === "not_member") return false;
  return !membershipRequiresApi();
}
