import { AccountProfilePage } from "@/components/account/AccountProfilePage";

export default function ParentProfilePage() {
  return (
    <AccountProfilePage
      accent="teal"
      eyebrow="Parent account"
      pageTitle="Parent Profile"
      intro="Update your personal details, manage your avatar, and review the information linked to your parent account."
      securityTitle="School-managed access"
      securityNote="Linked children, school relationships, and role access are managed by the school. Use this page for personal details and your avatar."
      settingsCardTitle="Parent settings"
      settingsCardBody="Review your session details, password controls, and device preferences in settings."
      settingsHref="/app/parent/settings"
      settingsLinkLabel="Open settings"
    />
  );
}
