import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinPageClient } from "@/components/auth/join-page-client";
import { isApprovedMember } from "@/lib/auth/landing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Join your society · Living+",
};

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/join");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (await isApprovedMember(session?.access_token)) {
    redirect("/home");
  }

  const email = user.email ?? "";

  return <JoinPageClient email={email} />;
}
