"use client";

import { ArrowDown, GraduationCap, ShieldCheck, UserPlus, Users } from "lucide-react";

type AccountsSetupGuideProps = {
  onOpenStaffInvites?: () => void;
};

export function AccountsSetupGuide({ onOpenStaffInvites }: AccountsSetupGuideProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Students, parents & teachers</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Create school community logins here — not in the staff invitations panel.
            </p>
          </div>
        </div>
        <ol className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-semibold text-sky-600">1.</span>
            <span>
              Pick the <strong className="font-medium text-slate-800">Students</strong>,{" "}
              <strong className="font-medium text-slate-800">Teachers</strong>, or{" "}
              <strong className="font-medium text-slate-800">Parents</strong> tab below.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-sky-600">2.</span>
            <span>
              Click <strong className="font-medium text-slate-800">Add student / teacher / parent</strong>{" "}
              in the header (top right).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-sky-600">3.</span>
            <span>
              Share the one-time password shown after save. They sign in at{" "}
              <span className="font-medium text-slate-800">/login</span> and complete first-login setup.
            </span>
          </li>
        </ol>
        <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <GraduationCap className="h-3.5 w-3.5" />
          Assign classes from the directory after accounts exist.
        </p>
      </article>

      <article className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Office & leadership staff</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Deputy Head, Bursar, School Administrator, ICT, HR, and other office roles are{" "}
              <strong className="font-medium text-slate-800">invited</strong> in the panel below — not
              through the Add student/teacher/parent button.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Use <strong className="font-medium text-slate-800">Invite School Administrator</strong> or{" "}
              <strong className="font-medium text-slate-800">Invite other staff</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Pending invites and temporary passwords appear in that same section.</span>
          </li>
        </ul>
        {onOpenStaffInvites ? (
          <button
            type="button"
            onClick={onOpenStaffInvites}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <ArrowDown className="h-4 w-4" />
            Go to staff invitations
          </button>
        ) : null}
      </article>
    </div>
  );
}