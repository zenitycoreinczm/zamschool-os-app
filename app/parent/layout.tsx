import type { ReactNode } from "react";

import { WorkspaceContextProvider } from "@/components/WorkspaceContextProvider";
import ParentShell from "@/components/ParentShell";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceContextProvider>
      <ParentShell>{children}</ParentShell>
    </WorkspaceContextProvider>
  );
}
