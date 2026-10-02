"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function safeNextPath(next: string | undefined): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/join";
}

export function LoginActions({ error, next }: { error?: string; next?: string }) {
  const afterAuth = safeNextPath(next);
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(
    error === "auth" ? "Google sign-in was cancelled or failed. Try again." : null,
  );

  async function signInWithGoogle() {
    setLocalError(null);
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterAuth)}`,
        },
      });
      if (oauthError) {
        setLocalError(oauthError.message);
        setPending(false);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setPending(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {localError ? (
        <p className="text-center text-callout text-status-red" role="alert">
          {localError}
        </p>
      ) : null}

      <Button type="button" className="h-12 w-full" disabled={pending} onClick={() => void signInWithGoogle()}>
        <GoogleMark className="h-[18px] w-[18px]" />
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>

      <p className="pt-3 text-center text-callout text-ink-secondary">
        Have a society invite code?{" "}
        <Link href="/join" className="font-semibold text-primary">
          Join here
        </Link>
      </p>
    </div>
  );
}
