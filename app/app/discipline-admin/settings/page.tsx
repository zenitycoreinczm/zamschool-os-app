import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function DisciplineAdminSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your discipline-admin workspace account."
      accent="rose"
      preferencesStorageKey="discipline-admin-workspace-settings"
      sessionTitle="Discipline Admin session"
      sessionBody="Signed-in discipline admin account on this device."
      eyebrow="Discipline admin workspace"
    />
  );
}
