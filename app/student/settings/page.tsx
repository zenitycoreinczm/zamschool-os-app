import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function StudentSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Student Settings"
      intro="Security, notification preferences, and session management for your student account."
      accent="sky"
      preferencesStorageKey="student-workspace-settings"
      sessionTitle="Student session"
      sessionBody="Signed-in student account on this device."
    />
  );
}
