export const PENDING_INVITE_KEY = "lp-pending-invite";

export function readPendingInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function writePendingInviteCode(code: string): void {
  try {
    window.sessionStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function clearPendingInviteCode(): void {
  try {
    window.sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* ignore */
  }
}
