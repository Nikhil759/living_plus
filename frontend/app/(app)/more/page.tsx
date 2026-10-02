import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Home,
  IndianRupee,
  LifeBuoy,
  Megaphone,
  ShoppingBag,
  Store,
  User,
  Users,
  Waves,
} from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/events", label: "Events", description: "Browse and host gatherings", icon: CalendarDays },
  { href: "/community", label: "Community", description: "Groups and neighbours", icon: Users },
  { href: "/amenities", label: "Amenities", description: "Live gym, pool, courts", icon: Waves },
  {
    href: "/announcements",
    label: "Announcements",
    description: "Society notices and digests",
    icon: Megaphone,
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    description: "Buy and sell second-hand items",
    icon: ShoppingBag,
  },
  {
    href: "/local-businesses",
    label: "Local businesses",
    description: "Tiffin, services, and shops nearby",
    icon: Store,
  },
  {
    href: "/flat-openings",
    label: "Flat openings",
    description: "Rooms, flatmates & full flats",
    icon: Home,
  },
  {
    href: "/help-desk",
    label: "Help desk",
    description: "Issues, feedback & vendor directory",
    icon: LifeBuoy,
  },
  {
    href: "/rent",
    label: "Rent · Coming soon",
    description: "Track rent and recurring payments",
    icon: IndianRupee,
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Packages, RSVPs, updates",
    icon: Bell,
  },
  { href: "/profile", label: "Profile", description: "Your flat and roles", icon: User },
] as const;

export default function MorePage() {
  return (
    <AppPage title="More">
      <p className="text-body-md text-on-surface-variant">
        Shortcuts to everything in the app.
      </p>
      <ul className="space-y-2">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link href={href}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-container-low">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-label-lg text-on-surface">{label}</span>
                  <span className="block text-body-sm text-on-surface-variant">{description}</span>
                </span>
                <ChevronRight
                  className={cn("h-5 w-5 shrink-0 text-on-surface-variant")}
                  aria-hidden="true"
                />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </AppPage>
  );
}
