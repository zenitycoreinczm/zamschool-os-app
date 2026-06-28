/**
 * Events page skeleton loading state.
 */
export default function EventsLoading() {
  return (
    <div
      className="space-y-5 py-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-32 animate-pulse rounded-workspace-xl border border-workspace-border bg-white" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="h-80 animate-pulse rounded-workspace-xl border border-workspace-border bg-white" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-workspace-xl border border-workspace-border bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
