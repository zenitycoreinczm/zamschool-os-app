export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Offline</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">This page is not available offline yet.</h1>
        <p className="mt-4 text-base leading-7 text-slate-200">
          Reconnect to load this page, or return to one of the preloaded core screens that stay readable when the
          internet drops.
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
          Reconnect and refresh to continue using live school data.
        </div>
      </div>
    </main>
  );
}
