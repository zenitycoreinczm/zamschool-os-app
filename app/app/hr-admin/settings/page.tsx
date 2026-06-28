import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function HrAdminSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your HR-admin workspace account."
      accent="emerald"
      preferencesStorageKey="hr-admin-workspace-settings"
      sessionTitle="HR Admin session"
      sessionBody="Signed-in HR admin account on this device."
      eyebrow="HR admin workspace"
    />
  );
}
