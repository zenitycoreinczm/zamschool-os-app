/**
 * Dashboard-specific skeleton loading state.
 * Renders placeholder cards matching the dashboard layout.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 py-4">
      {/* Summary stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      {/* Main content area skeleton */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
