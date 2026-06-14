"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800/40 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 text-white shadow-lg">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-red-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-[-2rem] h-72 w-72 rounded-full bg-red-500/8 blur-3xl" />
        {/* Dot grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative p-8 text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/30">
            <AlertTriangle className="h-8 w-8 text-red-300" />
          </div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>

          <p className="mb-6 text-sm leading-relaxed text-slate-300/90">
            We apologize for the inconvenience. An unexpected error occurred.
          </p>

          {error.message ? (
            <div className="mb-6 rounded-xl border border-slate-700/60 bg-slate-800/60 p-3 text-left">
              <p className="break-all text-xs font-mono leading-relaxed text-slate-400">
                {error.message}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <Home className="h-4 w-4" />
              Return home
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Error ID: {error.digest || "unknown"}
          </p>
        </div>
      </div>
    </div>
  );
}
