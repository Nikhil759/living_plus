import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { AppPage } from "@/components/layout/app-page";
import { ProfileLogoutButton } from "@/components/auth/profile-logout-button";
import { ProfileInterests } from "@/components/profile/profile-interests";
import { ProfileMyCommunities } from "@/components/profile/profile-my-communities";
import { ProfileMyEvents } from "@/components/profile/profile-my-events";
import { ProfileMyBookings } from "@/components/profile/profile-my-bookings";
import { ProfileMyRequests } from "@/components/profile/profile-my-requests";
import { ProfilePageLayout } from "@/components/profile/profile-page-layout";
import { ProfilePrivacySwitches } from "@/components/profile/profile-privacy-switches";
import { ProfileRentSection } from "@/components/profile/profile-rent-section";
import { buttonVariants } from "@/components/ui/button";
import { demoListUserRsvpEventIds } from "@/lib/demo-store/events-write";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import { isMyRequest } from "@/lib/help-desk/access";
import {
  loadCommunity,
  loadEvents,
  loadHelpDeskIssues,
  loadMyBookings,
  loadRentDashboard,
  loadResident,
  getDataSource,
  profileEditBackend,
  eventsWriteBackend,
} from "@/lib/data";
import { pickMyEvents, pickMyGroups, pickMyWhatsappGroups } from "@/lib/profile/my-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const [resident, events, community, rent, bookings, issues] = await Promise.all([
    loadResident(),
    loadEvents(),
    loadCommunity(),
    loadRentDashboard(),
    loadMyBookings(),
    loadHelpDeskIssues(),
  ]);
  const supabase = await createServerSupabaseClient();
  const email =
    supabase != null ? (await supabase.auth.getUser()).data.user?.email ?? null : null;

  let rsvpEventIds: string[] | undefined;
  if (eventsWriteBackend() === "demo") {
    const session = await getDemoSessionUser();
    if (session) rsvpEventIds = demoListUserRsvpEventIds(session.id);
  }
  const myEvents = pickMyEvents(events, resident, 3, { rsvpEventIds });
  const myGroups = pickMyGroups(community, resident).slice(0, 3);
  const myWhatsapp = pickMyWhatsappGroups(community, resident);
  const editBackend = profileEditBackend();
  const showEdit = editBackend === "demo" || getDataSource() === "api";
  const myIssues = issues.filter((i) => isMyRequest(i, resident, email));

  const flatLine = resident.showFlat
    ? `${resident.tower} · ${resident.flat}`
    : `${resident.tower} · Tenant`;

  const header = (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={resident.name} src={resident.avatarUrl} size="md" className="!h-[4.5rem] !w-[4.5rem] text-title" />
          <div>
            <h1 className="text-title text-ink">{resident.name}</h1>
            <p className="text-body text-ink-secondary">{flatLine}</p>
            <p className="text-caption text-ink-tertiary">{resident.society}</p>
          </div>
        </div>
        {showEdit ? (
          <Link href="/profile/edit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Edit profile
          </Link>
        ) : null}
      </div>
      {showEdit ? (
        <ProfilePrivacySwitches
          backend={editBackend}
          initialVisible={resident.isVisible ?? false}
          initialShowFlat={resident.showFlat ?? false}
        />
      ) : null}
      {resident.bio ? (
        <p className="mt-4 border-t border-outline-variant/30 pt-4 text-body text-ink-secondary">
          {resident.bio}
        </p>
      ) : null}
    </Card>
  );

  const interests = (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-headline text-ink">Interests</h2>
        {showEdit ? (
          <Link href="/profile/edit" className="text-callout font-semibold text-primary">
            Add interests
          </Link>
        ) : null}
      </div>
      <ProfileInterests interests={resident.interests ?? []} />
    </Card>
  );

  const settings = (
    <Card className="space-y-4 p-5 sm:p-6">
      <h2 className="text-headline text-ink">Settings</h2>
      <ul className="space-y-2 text-callout">
        <li>
          <span className="text-ink-secondary">Notification preferences</span>
          <span className="text-ink-tertiary"> — coming soon</span>
        </li>
        <li>
          <Link href="/profile/edit" className="font-medium text-primary">
            Privacy & profile
          </Link>
        </li>
      </ul>
      <ProfileLogoutButton />
    </Card>
  );

  return (
    <AppPage title="Profile">
      <ProfilePageLayout
        header={header}
        interests={interests}
        events={<ProfileMyEvents events={myEvents} />}
        bookings={<ProfileMyBookings bookings={bookings} />}
        rent={<ProfileRentSection rent={rent} />}
        requests={<ProfileMyRequests issues={myIssues} />}
        groups={<ProfileMyCommunities groups={myGroups} whatsappGroups={myWhatsapp} />}
        settings={settings}
      />
    </AppPage>
  );
}
