"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileLogoutButtonProps {
  className?: string;
}

export function ProfileLogoutButton({ className }: ProfileLogoutButtonProps) {
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
    <button
      type="button"
      disabled={pending}
      onClick={() => void logOut()}
      className={cn(
        buttonVariants({ size: "sm" }),
        "w-full bg-status-red/10 text-status-red ring-1 ring-inset ring-status-red/25",
        "hover:bg-status-red/18 active:bg-status-red/22",
        "lg:w-auto lg:min-w-[9.5rem]",
        className,
      )}
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
