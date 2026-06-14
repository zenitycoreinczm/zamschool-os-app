import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}
