import { AccountProfilePage } from "@/components/account/AccountProfilePage";

export default function StudentProfilePage() {
  return (
    <AccountProfilePage
      accent="sky"
      eyebrow="Student account"
      pageTitle="Student Profile"
      intro="Update your personal details, manage your avatar, and review the information linked to your student account."
      securityTitle="School-managed access"
      securityNote="Your school manages your class placement, results, and role access. Use this page for personal details and your avatar."
      settingsCardTitle="Student settings"
      settingsCardBody="Review your session details, password controls, and device preferences in settings."
      settingsHref="/student/settings"
      settingsLinkLabel="Open settings"
    />
  );
}
