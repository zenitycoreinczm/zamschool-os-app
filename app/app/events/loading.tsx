/**
 * Events page skeleton loading state.
 */
export default function EventsLoading() {
  return (
    <div className="space-y-6 py-2">
      {/* Header skeleton */}
      <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Calendar skeleton */}
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />

        {/* Event list skeleton */}
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-xl border border-slate-200 bg-white" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-slate-100 bg-slate-50/50 p-3"
            >
              <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
