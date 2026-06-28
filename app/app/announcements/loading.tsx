/**
 * Announcements page skeleton loading state.
 */
export default function AnnouncementsLoading() {
  return (
    <div
      className="space-y-5 py-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Header skeleton */}
      <div className="h-32 animate-pulse rounded-workspace-xl border border-workspace-border bg-white" />

      {/* List skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-workspace-xl border border-workspace-border bg-white p-6"
          >
            <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
