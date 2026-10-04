"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import LoginScene from "@/components/login/LoginScene";
import { inviteRedeemError } from "@/lib/api/invite-errors";
import { lookupInviteCode } from "@/lib/api/lookup-invite";
import { redeemInvite } from "@/lib/api/invites";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function JoinPageClient({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const lookupInvite = useCallback(
    (code: string) => lookupInviteCode(code),
    [],
  );

  return (
    <LoginScene
      onGoogleSignIn={async () => {
        throw new Error("Use sign out and return to login.");
      }}
      joinFlow={{
        email,
        onLookup: lookupInvite,
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
