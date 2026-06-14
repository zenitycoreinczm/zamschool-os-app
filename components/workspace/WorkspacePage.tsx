import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  children: ReactNode;
  className?: string;
  /** Stagger child sections on first paint */
  animate?: boolean;
};

export function WorkspacePage({ children, className, animate = true }: WorkspacePageProps) {
  return (
    <div
      className={cn(
        "zamschool-workspace-main-inner space-y-5",
        animate && "animate-enter-up",
        className
      )}
    >
      {children}
    </div>
  );
}