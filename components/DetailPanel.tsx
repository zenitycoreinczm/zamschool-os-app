"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export type DetailBadge = {
  label: string;
  tone?: "default" | "accent" | "success" | "warning";
};

export type DetailMetaItem = {
  label: string;
  value: string;
};

type DetailPanelProps = {
  open: boolean;
  title: string;
  eyebrow: string;
  subtitle?: string;
  badges?: DetailBadge[];
  meta?: DetailMetaItem[];
  footer?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
};

export default function DetailPanel({
  open,
  title,
  eyebrow,
  subtitle,
  badges = [],
  meta = [],
  footer,
  children,
  onClose,
}: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    // Focus the first focusable element inside the panel
    requestAnimationFrame(() => {
      const firstFocusable = panel?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-title"
        className="absolute inset-y-0 right-0 flex w-full justify-end"
      >
        <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-workspace-lg">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
                  {eyebrow}
                </p>
                <div>
                  <h2 id="detail-panel-title" className="text-2xl font-semibold leading-tight text-slate-900">{title}</h2>
                  {subtitle ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
                  ) : null}
                </div>
                {badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <span
                        key={`${badge.label}-${badge.tone || "default"}`}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeToneClass(
                          badge.tone || "default"
                        )}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
            {meta.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {meta.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={`${meta.length > 0 ? "mt-5" : ""} space-y-4`}>{children}</div>
          </div>

          {footer ? (
            <div className="border-t border-slate-200 bg-white px-5 py-4 md:px-6">{footer}</div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function badgeToneClass(tone: DetailBadge["tone"]) {
  switch (tone) {
    case "accent":
      return "bg-sky-500 text-white";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}
