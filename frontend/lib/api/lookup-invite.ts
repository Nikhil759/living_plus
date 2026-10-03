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
    let detail =
      "That code isn't valid or has already been used. Try another guest code or ask your committee.";
    try {
      const body = (await response.clone().json()) as { code?: string };
      if (body.code === "invalid_invite") {
        detail =
          "The API is up but this code isn't in the database yet. Redeploy Railway (runs seed on start) or run scripts/seed.py once.";
      }
    } catch {
      /* ignore */
    }
    throw new InviteFlowError("invalid", "Invalid invite code", detail);
  }

  if (response.status === 503) {
    throw inviteLookupError(new TypeError("failed to fetch"));
  }

  if (!response.ok) {
    throw inviteLookupError(new Error(`lookup ${response.status}`));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw inviteLookupError(new TypeError("failed to fetch"));
  }

  return (await response.json()) as SocietyMatch;
}
