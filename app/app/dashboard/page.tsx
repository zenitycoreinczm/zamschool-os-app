import AdminDashboardHome from "@/components/admin-workspaces/AdminDashboardHome";
import { DashboardSummaryProvider } from "@/components/DashboardSummaryProvider";

export default function AppDashboardPage() {
  return (
    <DashboardSummaryProvider>
      <AdminDashboardHome />
      {/* SchoolAdminDashboard */}
    </DashboardSummaryProvider>
  );
}