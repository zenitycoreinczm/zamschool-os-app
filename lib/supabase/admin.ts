import { createClient } from "@supabase/supabase-js";

let supabaseAdminInstance: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase admin client misconfigured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  supabaseAdminInstance = createClient<any>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        // Add timeout to all fetch calls (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        return fetch(url, { ...options, signal: controller.signal }).finally(() =>
          clearTimeout(timeoutId)
        );
      },
    },
  });

  return supabaseAdminInstance;
}

// For backward compatibility, export a getter that throws if accessed before initialization (use getSupabaseAdmin() instead)
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<any>>, {
  get(_target, prop) {
    return getSupabaseAdmin()[prop as keyof ReturnType<typeof createClient<any>>];
  },
});