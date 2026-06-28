import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function BursarSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your bursar workspace account."
      accent="amber"
      preferencesStorageKey="bursar-workspace-settings"
      sessionTitle="Bursar session"
      sessionBody="Signed-in bursar account on this device."
      eyebrow="Bursar workspace"
    />
  );
}
