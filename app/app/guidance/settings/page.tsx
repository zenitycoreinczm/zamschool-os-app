import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function GuidanceSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your guidance-office workspace account."
      accent="rose"
      preferencesStorageKey="guidance-office-workspace-settings"
      sessionTitle="Guidance session"
      sessionBody="Signed-in guidance office account on this device."
      eyebrow="Guidance office workspace"
    />
  );
}
