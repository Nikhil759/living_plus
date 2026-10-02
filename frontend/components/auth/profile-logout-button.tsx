"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ProfileLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logOut() {
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      disabled={pending}
      onClick={() => void logOut()}
    >
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
