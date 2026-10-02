import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AppPage } from "@/components/layout/app-page";
import { ProfileLogoutButton } from "@/components/auth/profile-logout-button";
import { ProfileInterests } from "@/components/profile/profile-interests";
import { ProfilePrivacySummary } from "@/components/profile/profile-privacy-summary";
import { ProfileMyCommunities } from "@/components/profile/profile-my-communities";
import { ProfileMyEvents } from "@/components/profile/profile-my-events";
import { ProfilePageLayout } from "@/components/profile/profile-page-layout";
import { ProfileRentSection } from "@/components/profile/profile-rent-section";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { demoListUserRsvpEventIds } from "@/lib/demo-store/events-write";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import {
  loadCommunity,
  loadEvents,
  loadRentDashboard,
  loadResident,
  getDataSource,
  profileEditBackend,
  eventsWriteBackend,
} from "@/lib/data";
import {
  pickMyEvents,
  pickMyGroups,
  pickMyWhatsappGroups,
} from "@/lib/profile/my-activity";

export default async function ProfilePage() {
  const [resident, events, community, rent] = await Promise.all([
    loadResident(),
    loadEvents(),
    loadCommunity(),
    loadRentDashboard(),
  ]);
  let rsvpEventIds: string[] | undefined;
  if (eventsWriteBackend() === "demo") {
    const session = await getDemoSessionUser();
    if (session) {
      rsvpEventIds = demoListUserRsvpEventIds(session.id);
    }
  }
  const myEvents = pickMyEvents(events, resident, 4, { rsvpEventIds });
  const myGroups = pickMyGroups(community, resident);
  const myWhatsapp = pickMyWhatsappGroups(community, resident);
  const apiMode = getDataSource() === "api";
  const editBackend = profileEditBackend();
  const showEditForm = editBackend === "demo" || apiMode;
  const interests = resident.interests ?? [];
  const isVisible = resident.isVisible ?? false;
  const showFlat = resident.showFlat ?? false;
  const flatLabel =
    !showFlat && showEditForm ? `${resident.tower} · Flat hidden` : `${resident.tower} · ${resident.flat}`;

  const identityCard = (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <Avatar name={resident.name} src={resident.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="text-title text-ink">{resident.name}</h1>
          <p className="text-body text-ink-secondary">{flatLabel}</p>
          <p className="text-caption text-ink-tertiary">{resident.society}</p>
          {resident.roles[0] ? <Badge className="mt-2">{resident.roles[0]}</Badge> : null}
          <ProfilePrivacySummary
            isVisible={isVisible}
            showFlat={showFlat}
            apiMode={showEditForm}
          />
        </div>
      </div>
      {resident.bio ? (
        <p className="mt-4 border-t border-outline-variant/30 pt-4 text-body text-ink-secondary">
          {resident.bio}
        </p>
      ) : null}
      <div className="mt-4 border-t border-outline-variant/30 pt-4">
        <p className="text-caption font-medium text-ink-secondary">Interests</p>
        <ProfileInterests interests={interests} />
      </div>
    </Card>
  );

  const activitySections = (
    <>
      <ProfileMyEvents events={myEvents} />
      <ProfileMyCommunities groups={myGroups} whatsappGroups={myWhatsapp} />
    </>
  );

  const settingsSection = showEditForm ? (
    <ProfileSettingsForm
      backend={editBackend}
      initial={{
        bio: resident.bio,
        interests: resident.interests,
        isVisible: resident.isVisible,
        showFlat: resident.showFlat,
      }}
    />
  ) : (
    <div className="flex justify-stretch sm:justify-end">
      <ProfileLogoutButton />
    </div>
  );

  return (
    <AppPage title="Profile">
      <ProfilePageLayout
        identity={identityCard}
        rent={<ProfileRentSection rent={rent} />}
        activity={activitySections}
        settings={settingsSection}
      />
    </AppPage>
  );
}
