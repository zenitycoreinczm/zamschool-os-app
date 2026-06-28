import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function PrincipalSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your head-teacher workspace account."
      accent="indigo"
      preferencesStorageKey="principal-workspace-settings"
      sessionTitle="Head Teacher session"
      sessionBody="Signed-in head teacher account on this device."
      eyebrow="Head Teacher workspace"
    />
  );
}
