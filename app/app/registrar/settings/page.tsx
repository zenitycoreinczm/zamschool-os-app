import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function RegistrarSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Session details, notification preferences, password controls, and multi-factor authentication for your registrar workspace account."
      accent="emerald"
      preferencesStorageKey="registrar-workspace-settings"
      sessionTitle="Registrar session"
      sessionBody="Signed-in registrar account on this device."
      eyebrow="Registrar workspace"
    />
  );
}
