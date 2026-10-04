"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LoginScene from "@/components/login/LoginScene";
import { inviteRedeemError } from "@/lib/api/invite-errors";
import { lookupInviteCode } from "@/lib/api/lookup-invite";
import { redeemInvite } from "@/lib/api/invites";
import {
  clearPendingInviteCode,
  readPendingInviteCode,
} from "@/lib/auth/pending-invite";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function JoinPageClient({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [initialCode, setInitialCode] = useState<string | undefined>();

  useEffect(() => {
    setInitialCode(readPendingInviteCode() ?? undefined);
  }, []);

  const lookupInvite = useCallback(
    (code: string) => lookupInviteCode(code),
    [],
  );

  return (
    <LoginScene
      onGoogleSignIn={async () => {
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
            const mapped = inviteRedeemError(err);
            throw mapped;
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
