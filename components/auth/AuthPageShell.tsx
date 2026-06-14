import type { ReactNode } from "react";

import { ws } from "@/lib/workspace-design";
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
        "relative min-h-screen overflow-hidden text-slate-900",
        ws.canvas,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-white/30 backdrop-blur-[1px]"
        aria-hidden
      />
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
