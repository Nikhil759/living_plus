import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedAppRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const destination = await postAuthPath(session?.access_token);

  if (pathname === "/login") {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const target =
      destination === "/home" && next ? next : destination === "/home" ? "/home" : "/join";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname === "/join" && destination === "/home") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isProtectedAppRoute(pathname) && destination === "/join") {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
