import { redirect } from "next/navigation";
import { AskShortcut } from "@/components/layout/ask-shortcut";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ApiError } from "@/lib/api/client";
import { loadResident } from "@/lib/data";
import { getStaticResident } from "@/lib/data/static";
import { loadSessionResidentFallback } from "@/lib/auth/session-resident";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let resident = getStaticResident();
  try {
    resident = await loadResident();
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      redirect("/join");
    }
    const sessionResident = await loadSessionResidentFallback();
    if (sessionResident) {
      resident = sessionResident;
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <AskShortcut />
      <Sidebar resident={resident} />
      <div className="min-w-0 lg:pl-sidebar">{children}</div>
      <BottomNav />
    </div>
  );
}
