import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AuthPageShell({
  children,
  className,
  contentClassName,
}: AuthPageShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden bg-slate-50 text-slate-900",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-200" aria-hidden />
      <main
        className={cn(
          "relative mx-auto flex min-h-screen w-full items-center justify-center p-4 sm:p-6",
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
