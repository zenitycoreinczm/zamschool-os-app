import { Loader2 } from "lucide-react";

export default function ParentAbsenceLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-slate-500">Loading absences…</p>
      </div>
    </div>
  );
}
