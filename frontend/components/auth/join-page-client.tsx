"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LoginScene, { type SocietyMatch } from "@/components/login/LoginScene";
import { ApiError } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/config";
import { redeemInvite } from "@/lib/api/invites";
import {
  clearPendingInviteCode,
  readPendingInviteCode,
} from "@/lib/auth/pending-invite";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function redeemErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

export function JoinPageClient({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [initialCode, setInitialCode] = useState<string | undefined>();

  useEffect(() => {
    setInitialCode(readPendingInviteCode() ?? undefined);
  }, []);

  const lookupInvite = useCallback(async (code: string): Promise<SocietyMatch | null> => {
    const res = await fetch(
      `${getApiBaseUrl()}/v1/societies/lookup?code=${encodeURIComponent(code)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("We couldn't check that code. Try again.");
    return (await res.json()) as SocietyMatch;
  }, []);

  return (
    <LoginScene
      onEmailSignIn={async () => {
        throw new Error("Use sign out and return to login.");
      }}
      onGoogleSignIn={async () => {
        throw new Error("Use sign out and return to login.");
      }}
      onForgotPassword={async () => {
        throw new Error("Use sign out and return to login.");
      }}
      onLookupInvite={lookupInvite}
      joinFlow={{
        email,
        initialCode,
        onRedeem: async (code) => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) {
            router.push("/login?next=/join");
            return;
          }
          try {
            await redeemInvite(code, session.access_token);
          } catch (err) {
            throw new Error(redeemErrorMessage(err));
          }
          clearPendingInviteCode();
          router.replace("/home");
          router.refresh();
        },
        onSignOut: async () => {
          await supabase.auth.signOut();
          router.push("/login");
          router.refresh();
        },
      }}
    />
  );
}
