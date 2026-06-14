/**
 * Next.js 16 instrumentation hook
 *
 * Automatically called once during server startup. Installs the global
 * Supabase fetch guard that rate-limits ALL *.supabase.co requests
 * at 25 req/s to stay within free-tier limits.
 *
 * Next.js 15+ auto-detects this file at the project root — no
 * experimental config flag needed.
 */
export async function register() {
  // Only run on the server
  if (typeof window !== "undefined") return;

  try {
    const { installSupabaseFetchGuard } = await import(
      "./lib/supabase-fetch-guard"
    );
    installSupabaseFetchGuard();

    console.log("[Instrumentation] Supabase fetch guard installed — 25 req/s limit enforced.");
  } catch (error) {
    console.error(
      "[Instrumentation] Failed to install Supabase fetch guard:",
      error instanceof Error ? error.message : error
    );
  }
}
