import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/join";
  const safeNext = next.startsWith("/") ? next : "/home";

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.redirect(new URL("/login?error=config", origin));
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
