import Link from "next/link";
import type { ReactNode } from "react";

import LandingFooter from "@/components/landing/LandingFooter";

type LegalSection = {
  title: string;
  body: ReactNode;
};

type LegalPageLayoutProps = {
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export default function LegalPageLayout({
  title,
  summary,
  lastUpdated,
  sections,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Back to home
          </Link>
        </div>

        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Legal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{summary}</p>
          <p className="mt-6 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </header>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8"
            >
              <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
