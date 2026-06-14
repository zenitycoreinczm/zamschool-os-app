import type { Session } from "@supabase/supabase-js";

export function buildAuthApiHeaders(session: Session | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}