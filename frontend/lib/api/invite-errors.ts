import { ApiError } from "@/lib/api/client";

export type InviteErrorKind = "invalid" | "unavailable" | "redeem";

export class InviteFlowError extends Error {
  readonly kind: InviteErrorKind;
  readonly title: string;

  constructor(kind: InviteErrorKind, title: string, message: string) {
    super(message);
    this.name = "InviteFlowError";
    this.kind = kind;
    this.title = title;
  }
}

export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
  }
  return false;
}

export function inviteLookupError(error: unknown): InviteFlowError {
  if (error instanceof InviteFlowError) return error;
  if (isNetworkFailure(error)) {
    return new InviteFlowError(
      "unavailable",
      "Can't verify code right now",
      "We couldn't reach the server. On the live app, connect the API (Railway) in Vercel env. Locally, run the backend on port 8000.",
    );
  }
  return new InviteFlowError(
    "invalid",
    "Invalid invite code",
    "That code isn't valid, has already been used, or was typed wrong. Try another code or ask your committee for a new one.",
  );
}

export function inviteRedeemError(error: unknown): InviteFlowError {
  if (error instanceof InviteFlowError) return error;
  if (error instanceof ApiError) {
    if (error.status === 409 || error.code === "invite_consumed") {
      return new InviteFlowError(
        "invalid",
        "Invalid invite code",
        "This code has already been used. Run seed again for a fresh guest code, or ask for a new invite.",
      );
    }
    if (error.status === 403 || error.code === "email_mismatch") {
      return new InviteFlowError(
        "invalid",
        "Invalid invite code",
        "This code is tied to a different email. Sign in with that account or use a guest demo code.",
      );
    }
    return new InviteFlowError("invalid", "Couldn't join", error.message);
  }
  if (isNetworkFailure(error)) {
    return inviteLookupError(error);
  }
  return new InviteFlowError(
    "invalid",
    "Couldn't join",
    "Something went wrong. Try again in a moment.",
  );
}
