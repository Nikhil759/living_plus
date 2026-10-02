/** Set by middleware after GET /v1/me confirms membership; avoids repeating that call every navigation. */
export const MEMBER_COOKIE = "aangan_member";

export const MEMBER_COOKIE_VALUE = "1";

export const MEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function hasMemberCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes(`${MEMBER_COOKIE}=${MEMBER_COOKIE_VALUE}`);
}
