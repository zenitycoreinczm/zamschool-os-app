"use client";

import { useEffect } from "react";

import OfflineStatusBanner from "@/components/OfflineStatusBanner";
import { fetchWithOfflineSupport } from "@/lib/offline-fetch";
import { OFFLINE_CORE_API_URLS, OFFLINE_CORE_PAGE_URLS } from "@/lib/offline-support";
import { setNetworkOffline, setNetworkOnline } from "@/lib/network-status";
import { supabase } from "@/lib/supabase";

const OFFLINE_WARMUP_KEY = "zamschool-offline-core-warmed-v1";

export default function OfflineStatusProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Failed to register offline service worker", error);
      });
    }

    const handleOnline = () => setNetworkOnline();
    const handleOffline = () => setNetworkOffline();

    if (navigator.onLine === false) {
      setNetworkOffline();
    } else {
      setNetworkOnline();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    void warmOfflineCore();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      <OfflineStatusBanner />
      {children}
    </>
  );
}

async function warmOfflineCore() {
  if (typeof window === "undefined" || navigator.onLine === false) {
    return;
  }

  if (window.sessionStorage.getItem(OFFLINE_WARMUP_KEY) === "1") {
    return;
  }

  window.sessionStorage.setItem(OFFLINE_WARMUP_KEY, "1");

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token || null;

  const pageWarmups = OFFLINE_CORE_PAGE_URLS.map((path) =>
    fetchWithOfflineSupport(path, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }).catch(() => null)
  );

  const apiWarmups = OFFLINE_CORE_API_URLS.map((path) =>
    fetchWithOfflineSupport(path, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }).catch(() => null)
  );

  await Promise.allSettled([...pageWarmups, ...apiWarmups]);
}
