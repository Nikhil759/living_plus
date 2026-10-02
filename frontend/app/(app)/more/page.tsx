import {
  Bell,
  CalendarDays,
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
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";

const LINKS = [
  { href: "/events", label: "Events", detail: "Browse and host gatherings", icon: CalendarDays },
  { href: "/community", label: "Community", detail: "Groups and neighbours", icon: Users },
  { href: "/amenities", label: "Amenities", detail: "Gym, pool, courts", icon: Waves },
  { href: "/announcements", label: "Notices", detail: "Society announcements", icon: Megaphone },
  { href: "/marketplace", label: "Marketplace", detail: "Second-hand from neighbours", icon: ShoppingBag },
  { href: "/local-businesses", label: "Local businesses", detail: "Tiffin, services, shops", icon: Store },
  { href: "/flat-openings", label: "Flat openings", detail: "Rooms, flatmates, full flats", icon: Home },
  { href: "/help-desk", label: "Help desk", detail: "Issues, feedback, directory", icon: LifeBuoy },
  { href: "/rent", label: "Rent · Coming soon", detail: "Track rent and recurring payments", icon: IndianRupee },
  { href: "/notifications", label: "Notifications", detail: "Packages, RSVPs, updates", icon: Bell },
  { href: "/profile", label: "Profile", detail: "Your flat and roles", icon: User },
] as const;

export default function MorePage() {
  return (
    <AppPage title="More">
      <GroupedList>
        {LINKS.map(({ href, label, detail, icon: Icon }) => (
          <ListRow
            key={href}
            href={href}
            title={label}
            detail={detail}
            leading={
              <IconTile>
                <Icon />
              </IconTile>
            }
          />
        ))}
      </GroupedList>
    </AppPage>
  );
}
