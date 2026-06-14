"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">Something went wrong</h1>

        <p className="mb-6 text-slate-600">
          An unexpected error occurred while loading this workspace page.
        </p>

        {error.message ? (
          <div className="mb-6 rounded-lg bg-slate-100 p-3 text-left">
            <p className="break-all text-xs font-mono text-slate-500">{error.message}</p>
          </div>
        ) : null}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-600"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">Error ID: {error.digest || "unknown"}</p>
      </div>
    </div>
  );
}
