import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

let hasValidatedEnv = false;

function validateEnv() {
  if (hasValidatedEnv) return;
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isBuildTime) {
      throw new Error("Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
  }
  hasValidatedEnv = true;
}

export async function createClient() {
  validateEnv();
  const cookieStore = await cookies();

  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isBuildTime) {
      return null as unknown as ReturnType<typeof createServerClient>;
    }
    throw new Error("Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handlers that mutate cookies should use dedicated helpers.
        }
      },
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
}
