import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import type { AmenityBooking } from "@/lib/types/amenities";
import { formatEventWhen } from "@/lib/format";

export function ProfileMyBookings({ bookings }: { bookings: AmenityBooking[] }) {
  const upcoming = bookings.slice(0, 3);
  return (
    <section className="space-y-4">
      <SectionHeader title="My bookings" action={{ label: "See all", href: "/amenities" }} />
      {upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck />}
          title="No bookings yet"
          action={
            <Link href="/amenities" className="text-callout font-semibold text-primary">
              Book a court
            </Link>
          }
        />
      ) : (
        <GroupedList>
          {upcoming.map((booking) => (
            <ListRow
              key={booking.id}
              href="/amenities"
              title={booking.amenityName}
              detail={formatEventWhen(booking.startsAt)}
            />
          ))}
        </GroupedList>
      )}
    </section>
  );
}
