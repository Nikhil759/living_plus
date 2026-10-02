import { AskShortcut } from "@/components/layout/ask-shortcut";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { loadResident } from "@/lib/data";
import { getStaticResident } from "@/lib/data/static";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let resident = getStaticResident();
  try {
    resident = await loadResident();
  } catch {
    /* API mode with backend down — keep static resident for shell labels. */
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
