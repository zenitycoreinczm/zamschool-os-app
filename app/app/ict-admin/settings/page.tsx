import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function IctAdminSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your ICT-admin workspace account."
      accent="slate"
      preferencesStorageKey="ict-admin-workspace-settings"
      sessionTitle="ICT Admin session"
      sessionBody="Signed-in ICT admin account on this device."
      eyebrow="ICT admin workspace"
    />
  );
}
