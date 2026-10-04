"use client";

import LoginScene from "@/components/login/LoginScene";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginPageClient({ supabaseConfigured = true }: { supabaseConfigured?: boolean }) {
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

  function googleRedirectTo(): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/join")}`;
  }

  return (
    <LoginScene
      onGoogleSignIn={async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: googleRedirectTo() },
        });
        if (error) throw new Error("Google sign-in didn't start. Try again.");
      }}
    />
  );
}
