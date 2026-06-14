import type { ReactNode } from "react";

import { WorkspaceContextProvider } from "@/components/WorkspaceContextProvider";
import TeacherShell from "@/components/TeacherShell";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceContextProvider>
      <TeacherShell>{children}</TeacherShell>
    </WorkspaceContextProvider>
  );
}
