"use client";

import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";
import { MfaSetup } from "@/components/account/MfaSetup";
import { MessagesPageHeader } from "@/components/messages/message-ui";

export default function AppSettingsPage() {
  return (
    <div className="space-y-4">
      <MessagesPageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Session details, notification preferences, password controls, and multi-factor authentication for your workspace account."
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
