import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function AcademicAdminSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your academic-admin workspace account."
      accent="violet"
      preferencesStorageKey="academic-admin-workspace-settings"
      sessionTitle="Academic Admin session"
      sessionBody="Signed-in academic admin account on this device."
      eyebrow="Academic admin workspace"
    />
  );
}
