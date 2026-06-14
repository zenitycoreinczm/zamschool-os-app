import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function ParentSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Parent Settings"
      intro="Security, notification preferences, and session management for your parent account."
      accent="teal"
      preferencesStorageKey="parent-workspace-settings"
      sessionTitle="Parent session"
      sessionBody="Signed-in parent account on this device."
    />
  );
}
