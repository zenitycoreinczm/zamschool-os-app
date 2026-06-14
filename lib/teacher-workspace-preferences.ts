"use client";

import { useEffect, useState } from "react";

export type TeacherWorkspacePreferences = {
  timezone: string;
  digestMode: "realtime" | "daily";
  compactCards: boolean;
};

export const TEACHER_WORKSPACE_PREFERENCES_KEY = "teacher-workspace-settings";

const TEACHER_WORKSPACE_PREFERENCES_EVENT =
  "teacher-workspace-preferences:change";

const DEFAULT_TEACHER_WORKSPACE_PREFERENCES: TeacherWorkspacePreferences = {
  timezone: "UTC",
  digestMode: "realtime",
  compactCards: false,
};

export function readTeacherWorkspacePreferences(
  storageKey = TEACHER_WORKSPACE_PREFERENCES_KEY,
): TeacherWorkspacePreferences {
  const fallback = buildDefaultTeacherWorkspacePreferences();

  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return fallback;
  }

  try {
    return normalizeTeacherWorkspacePreferences(JSON.parse(stored), fallback);
  } catch {
    window.localStorage.removeItem(storageKey);
    return fallback;
  }
}

export function writeTeacherWorkspacePreferences(
  preferences: TeacherWorkspacePreferences,
  storageKey = TEACHER_WORKSPACE_PREFERENCES_KEY,
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeTeacherWorkspacePreferences(preferences);
  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent(TEACHER_WORKSPACE_PREFERENCES_EVENT, {
      detail: { storageKey, preferences: normalized },
    }),
  );
}

export function useTeacherWorkspacePreferences(
  storageKey = TEACHER_WORKSPACE_PREFERENCES_KEY,
) {
  const [preferences, setPreferences] = useState<TeacherWorkspacePreferences>(
    () => readTeacherWorkspacePreferences(storageKey),
  );

  useEffect(() => {
    function syncPreferences() {
      setPreferences(readTeacherWorkspacePreferences(storageKey));
    }

    function onStorage(event: StorageEvent) {
      if (event.key && event.key !== storageKey) {
        return;
      }
      syncPreferences();
    }

    function onPreferencesChanged(event: Event) {
      const detail = (event as CustomEvent<{ storageKey?: string }>).detail;
      if (detail?.storageKey && detail.storageKey !== storageKey) {
        return;
      }
      syncPreferences();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      TEACHER_WORKSPACE_PREFERENCES_EVENT,
      onPreferencesChanged,
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        TEACHER_WORKSPACE_PREFERENCES_EVENT,
        onPreferencesChanged,
      );
    };
  }, [storageKey]);

  const updatePreferences = (partial: Partial<TeacherWorkspacePreferences>) => {
    const next = normalizeTeacherWorkspacePreferences({
      ...preferences,
      ...partial,
    });
    writeTeacherWorkspacePreferences(next, storageKey);
    setPreferences(next);
  };

  return { preferences, updatePreferences };
}

export const useTeacherPrefs = useTeacherWorkspacePreferences;

function buildDefaultTeacherWorkspacePreferences(): TeacherWorkspacePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_TEACHER_WORKSPACE_PREFERENCES;
  }

  return {
    ...DEFAULT_TEACHER_WORKSPACE_PREFERENCES,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

function normalizeTeacherWorkspacePreferences(
  raw: unknown,
  fallback = buildDefaultTeacherWorkspacePreferences(),
): TeacherWorkspacePreferences {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const candidate = raw as Partial<TeacherWorkspacePreferences>;

  return {
    timezone:
      typeof candidate.timezone === "string" &&
      candidate.timezone.trim().length > 0
        ? candidate.timezone
        : fallback.timezone,
    digestMode: candidate.digestMode === "daily" ? "daily" : "realtime",
    compactCards: candidate.compactCards === true,
  };
}
