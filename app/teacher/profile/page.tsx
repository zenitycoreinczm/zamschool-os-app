"use client";

import { AccountProfilePage } from "@/components/account/AccountProfilePage";

export default function TeacherProfilePage() {
  return (
    <AccountProfilePage
      accent="sky"
      eyebrow="Teacher workspace"
      pageTitle="Profile"
      intro="Update your personal information, manage your avatar, and review your teaching assignment details."
      securityTitle="Access guidance"
      securityNote="Profile fields here are editable by you. Role access and class assignments remain controlled by your Head Teacher or School Administrator."
      settingsCardTitle="Workspace settings"
      settingsCardBody="Use the settings page to review session details, workspace preferences, and password controls."
      settingsHref="/teacher/settings"
      settingsLinkLabel="Open settings"
      detailsTitle="School details"
      assignmentTitle="Teaching assignment"
      showTeacherDetails={true}
    />
  );
}
