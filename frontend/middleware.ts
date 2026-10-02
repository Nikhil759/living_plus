import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  MEMBER_COOKIE,
  MEMBER_COOKIE_MAX_AGE,
  MEMBER_COOKIE_VALUE,
  hasMemberCookie,
} from "@/lib/auth/member-cookie";
import { postAuthPath } from "@/lib/auth/membership";

const AUTH_ROUTES = new Set(["/login", "/join"]);
const AUTH_PREFIX = "/auth/";

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function isProtectedAppRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/api/")) return false;
  if (AUTH_ROUTES.has(pathname)) return false;
  if (pathname.startsWith(AUTH_PREFIX)) return false;
  if (pathname.startsWith("/_next")) return false;
  if (pathname === "/manifest.webmanifest") return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  return true;
}

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (AUTH_ROUTES.has(next) || next.startsWith(AUTH_PREFIX)) return null;
  return next;
}

function applyMemberCookie(response: NextResponse, isMember: boolean): NextResponse {
  if (isMember) {
    response.cookies.set(MEMBER_COOKIE, MEMBER_COOKIE_VALUE, {
      path: "/",
      maxAge: MEMBER_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    response.cookies.delete(MEMBER_COOKIE);
  }
  return response;
}

function needsMembershipApiCheck(pathname: string, request: NextRequest): boolean {
  if (pathname === "/" || pathname === "/login" || pathname === "/join") {
    return true;
  }
  if (isProtectedAppRoute(pathname) && !hasMemberCookie(request.headers.get("cookie") ?? undefined)) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const config = supabaseConfig();
  const pathname = request.nextUrl.pathname;

  if (!config) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    if (request.cookies.get(MEMBER_COOKIE)) {
      response.cookies.delete(MEMBER_COOKIE);
    }
    if (isProtectedAppRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const staticData =
    process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase() !== "api";
  if (staticData) {
    response = applyMemberCookie(response, true);
    if (pathname === "/login") {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next ?? "/home", request.url));
    }
    if (pathname === "/join" || pathname === "/") {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return response;
  }

  let destination: "/home" | "/join" | null = null;
  if (needsMembershipApiCheck(pathname, request)) {
    destination = await postAuthPath(session?.access_token);
    response = applyMemberCookie(response, destination === "/home");
  }

  if (pathname === "/login") {
    if (hasMemberCookie(request.headers.get("cookie") ?? undefined)) {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      const target = next ?? "/home";
      return NextResponse.redirect(new URL(target, request.url));
    }
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const home = destination ?? "/join";
    const target = home === "/home" && next ? next : home === "/home" ? "/home" : "/join";
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    return applyMemberCookie(redirectResponse, target !== "/join");
  }

  if (pathname === "/join") {
    const home =
      destination === "/home" ||
      (destination === null && hasMemberCookie(request.headers.get("cookie") ?? undefined));
    if (home) {
      const redirectResponse = NextResponse.redirect(new URL("/home", request.url));
      return applyMemberCookie(redirectResponse, true);
    }
    return response;
  }

  if (pathname === "/") {
    const dest =
      destination ??
      (hasMemberCookie(request.headers.get("cookie") ?? undefined) ? "/home" : "/join");
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
    return applyMemberCookie(redirectResponse, dest === "/home");
  }

  if (isProtectedAppRoute(pathname) && destination === "/join") {
    const redirectResponse = NextResponse.redirect(new URL("/join", request.url));
    return applyMemberCookie(redirectResponse, false);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
