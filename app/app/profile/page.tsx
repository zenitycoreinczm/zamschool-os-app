"use client";

import { AccountProfilePage } from "@/components/account/AccountProfilePage";

export default function AppProfilePage() {
  return (
    <AccountProfilePage
      accent="emerald"
      eyebrow="Workspace"
      pageTitle="Profile"
      intro="Welcome to your profile hub — update your personal details, manage your avatar, and keep your workspace identity polished and professional."
      securityTitle="Access guidance"
      securityNote="Profile fields here are editable by you. Role access and school-managed assignments remain controlled by your Head Teacher or School Administrator."
      settingsCardTitle="Workspace settings"
      settingsCardBody="Use the settings page to review session details, workspace preferences, and password controls."
      settingsHref="/app/settings"
      settingsLinkLabel="Open settings"
    />
  );
}
