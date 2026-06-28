import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function DeputyHeadSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your deputy-head workspace account."
      accent="sky"
      preferencesStorageKey="deputy-head-workspace-settings"
      sessionTitle="Deputy Head session"
      sessionBody="Signed-in deputy head account on this device."
      eyebrow="Deputy Head workspace"
    />
  );
}
