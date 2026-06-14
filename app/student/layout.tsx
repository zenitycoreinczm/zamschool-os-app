import type { ReactNode } from "react";

import { WorkspaceContextProvider } from "@/components/WorkspaceContextProvider";
import StudentShell from "@/components/StudentShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceContextProvider>
      <StudentShell>{children}</StudentShell>
    </WorkspaceContextProvider>
  );
}
