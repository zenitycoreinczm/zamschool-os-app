import { DashboardSummaryProvider } from "@/components/DashboardSummaryProvider";
import PrincipalWorkspace from "@/components/admin-workspaces/PrincipalWorkspace";

export default function PrincipalDashboardPage() {
  return (
    <DashboardSummaryProvider>
      <PrincipalWorkspace />
    </DashboardSummaryProvider>
  );
}
