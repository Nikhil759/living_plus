import type { SocietyMatch } from "@/components/login/LoginScene";
import { InviteFlowError, inviteLookupError } from "@/lib/api/invite-errors";

/** Same-origin proxy → backend (avoids CORS and surfaces API outages clearly). */
export async function lookupInviteCode(code: string): Promise<SocietyMatch | null> {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  if (normalized.length < 4) {
    throw new InviteFlowError(
      "invalid",
      "Invalid invite code",
      "Enter the full code from your committee (at least 4 characters).",
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `/api/societies/lookup?code=${encodeURIComponent(normalized)}`,
      { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
    );
  } catch (error) {
    throw inviteLookupError(error);
  }

  if (response.status === 404) {
    throw new InviteFlowError(
      "invalid",
      "Invalid invite code",
      "That code isn't valid or has already been used. Try another guest code or ask your committee.",
    );
  }

  if (response.status === 503) {
    throw inviteLookupError(new TypeError("failed to fetch"));
  }

  if (!response.ok) {
    throw inviteLookupError(new Error(`lookup ${response.status}`));
  }

  return (await response.json()) as SocietyMatch;
}
