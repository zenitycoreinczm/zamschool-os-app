"use client";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

let sessionLookup: Promise<{ session: Session | null; error: Error | null }> | null = null;

export async function getClientSession() {
  if (!sessionLookup) {
    sessionLookup = supabase.auth
      .getSession()
      .then(({ data, error }) => ({
        session: data.session ?? null,
        error: error ?? null,
      }))
      .finally(() => {
        sessionLookup = null;
      });
  }

  return sessionLookup;
}

export async function getClientAccessToken() {
  const { session } = await getClientSession();
  return session?.access_token || null;
}

export async function getClientUser(): Promise<User | null> {
  const { session } = await getClientSession();
  return session?.user ?? null;
}
