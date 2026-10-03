import { AppPage } from "@/components/layout/app-page";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { getDataSource, loadResident, profileEditBackend } from "@/lib/data";

export default async function ProfileEditPage() {
  const resident = await loadResident();
  const editBackend = profileEditBackend();
  const apiMode = getDataSource() === "api";
  const showForm = editBackend === "demo" || apiMode;

  return (
    <AppPage title="Edit profile" backHref="/profile" backLabel="Profile">
      {showForm ? (
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
        <p className="text-body text-ink-secondary">Profile editing is not available in this mode.</p>
      )}
    </AppPage>
  );
}
