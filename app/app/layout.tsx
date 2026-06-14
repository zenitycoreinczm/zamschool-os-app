"use client";

import AuthProvider from "@/components/AuthProvider";
import OfflineStatusProvider from "@/components/OfflineStatusProvider";
import RoleBasedShell from "@/components/RoleBasedShell";
import { WorkspaceContextProvider } from "@/components/WorkspaceContextProvider";

export default function AppWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkspaceContextProvider>
        <OfflineStatusProvider>
          <RoleBasedShell>{children}</RoleBasedShell>
        </OfflineStatusProvider>
      </WorkspaceContextProvider>
    </AuthProvider>
  );
}
