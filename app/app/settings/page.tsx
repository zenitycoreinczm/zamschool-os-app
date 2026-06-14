"use client";

import { KeyRound, Settings, Shield } from "lucide-react";

import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";
import { MfaSetup } from "@/components/account/MfaSetup";
import { AdminPageHero } from "@/components/admin/AdminPageHero";

export default function AppSettingsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHero
        eyebrow="Workspace"
        title="Settings"
        description="Session details, notification preferences, password controls, and multi-factor authentication for your workspace account."
        accent="emerald"
        stats={[
          {
            label: "Session",
            value: "Active",
            hint: "This device",
            icon: Shield,
            tone: "slate",
          },
          {
            label: "Security",
            value: "Password",
            hint: "Change below",
            icon: KeyRound,
            tone: "emerald",
          },
          {
            label: "MFA",
            value: "Setup",
            hint: "Extra protection",
            icon: Settings,
            tone: "emerald",
          },
        ]}
      />
      <AccountSettingsPage
        hideHeader
        preferencesStorageKey="workspace-account-settings"
        sessionTitle="Session"
        sessionBody="Signed-in account on this device."
        // pageTitle="Settings"
      />
      <MfaSetup />
    </div>
  );
}
