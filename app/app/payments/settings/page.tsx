import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function PaymentsSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your payments workspace account."
      accent="green"
      preferencesStorageKey="payments-workspace-settings"
      sessionTitle="Payments session"
      sessionBody="Signed-in payments account on this device."
      eyebrow="Payments workspace"
    />
  );
}
