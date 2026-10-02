import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/auth/login-page-client";
import { isApprovedMember } from "@/lib/auth/landing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next === "/login" || next === "/join" || next.startsWith("/auth/")) return null;
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const member = await isApprovedMember(session?.access_token);
    if (member) {
      const destination = safeNextPath(next) ?? "/home";
      redirect(destination);
    }
    redirect("/join");
  }

  return <LoginPageClient />;
}
