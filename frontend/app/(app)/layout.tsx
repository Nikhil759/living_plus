import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
// TODO: replace with the signed-in resident once auth exists.
import { mockResident } from "@/lib/mock/home";

/**
 * Authenticated app shell.
 *  - < lg: single column (max 672px, centred) with fixed top bar + bottom nav.
 *  - lg+:  fixed left sidebar, content column up to 1280px.
 * Each page renders its own <TopBar> so it can set the title.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <Sidebar resident={mockResident} />
      <div className="lg:pl-64">
        <div className="mx-auto w-full max-w-2xl lg:max-w-7xl">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
