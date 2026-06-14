"use client";

import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800/40 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 text-white shadow-lg">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-[-2rem] h-72 w-72 rounded-full bg-sky-500/8 blur-3xl" />
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
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-500/30">
            <FileQuestion className="h-8 w-8 text-sky-300" />
          </div>

          <h1 className="mb-1 text-5xl font-extrabold tracking-tight">404</h1>

          <h2 className="mb-2 text-xl font-semibold">Page Not Found</h2>

          <p className="mb-8 text-sm leading-relaxed text-slate-300/90">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400"
            >
              <Home className="h-4 w-4" />
              Return home
            </Link>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
