import { getApiBaseUrl } from "@/lib/api/config";

export type MembershipStatus = "member" | "not_member" | "unknown";

/** Calls GET /v1/me with the Supabase access token. */
export async function fetchMembershipStatus(accessToken: string): Promise<MembershipStatus> {
  const url = `${getApiBaseUrl()}/v1/me`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    if (response.ok) return "member";
    if (response.status === 403) {
      try {
        const body = (await response.json()) as { code?: string };
        if (body.code === "not_a_member") return "not_member";
      } catch {
        /* ignore */
      }
      return "not_member";
    }
    if (response.status === 401) return "not_member";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function membershipRequiresApi(): boolean {
  return process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase() === "api";
}

/** Where to send a signed-in user when API says they are not a member yet. */
export async function postAuthPath(accessToken: string | null | undefined): Promise<"/home" | "/join"> {
  if (!accessToken) return "/join";
  const status = await fetchMembershipStatus(accessToken);
  if (status === "member") return "/home";
  if (status === "not_member") return "/join";
  // API unreachable: strict in api mode, permissive in static demo mode.
  return membershipRequiresApi() ? "/join" : "/home";
}
