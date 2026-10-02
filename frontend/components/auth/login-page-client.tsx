"use client";

import { useRouter } from "next/navigation";
import LoginScene, { type SocietyMatch } from "@/components/login/LoginScene";
import { PENDING_INVITE_KEY, writePendingInviteCode } from "@/lib/auth/pending-invite";
import { getApiBaseUrl } from "@/lib/api/config";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginPageClient() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  function afterSignIn() {
    let pending: string | null = null;
    try {
      pending = window.sessionStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      /* ignore */
    }
    router.replace(pending ? "/join" : "/home");
    router.refresh();
  }

  function googleRedirectTo(): string {
    let pending: string | null = null;
    try {
      pending = window.sessionStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      /* ignore */
    }
    const next = pending ? "/join" : "/home";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  return (
    <LoginScene
      onEmailSignIn={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(
            "That email and password don't match. Try again or reset your password.",
          );
        }
        afterSignIn();
      }}
      onGoogleSignIn={async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: googleRedirectTo() },
        });
        if (error) throw new Error("Google sign-in didn't start. Try again.");
      }}
      onForgotPassword={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw new Error("We couldn't send the reset email. Try again in a minute.");
      }}
      onLookupInvite={async (code): Promise<SocietyMatch | null> => {
        const res = await fetch(
          `${getApiBaseUrl()}/v1/societies/lookup?code=${encodeURIComponent(code)}`,
        );
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("We couldn't check that code. Try again.");
        return (await res.json()) as SocietyMatch;
      }}
      onInviteConfirmed={(code) => {
        writePendingInviteCode(code);
      }}
    />
  );
}
