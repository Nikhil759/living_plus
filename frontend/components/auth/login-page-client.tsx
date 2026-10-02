"use client";

import { useRouter } from "next/navigation";
import LoginScene, { type SocietyMatch } from "@/components/login/LoginScene";
import { PENDING_INVITE_KEY, writePendingInviteCode } from "@/lib/auth/pending-invite";
import { lookupInviteCode } from "@/lib/api/lookup-invite";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginPageClient({ supabaseConfigured = true }: { supabaseConfigured?: boolean }) {
  const router = useRouter();

  if (!supabaseConfigured) {
    return (
      <main className="flex h-dvh items-center justify-center bg-canvas px-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-headline text-ink">Sign-in not configured</h1>
          <p className="text-body text-ink-secondary">
            Add <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel → Settings →
            Environment Variables, then redeploy.
          </p>
        </div>
      </main>
    );
  }

  const supabase = createBrowserSupabaseClient();

  function afterSignIn() {
    router.replace("/join");
    router.refresh();
  }

  function googleRedirectTo(): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/join")}`;
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
      onLookupInvite={lookupInviteCode}
      onInviteConfirmed={(code) => {
        writePendingInviteCode(code);
      }}
    />
  );
}
