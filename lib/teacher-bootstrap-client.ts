import type { TeacherBootstrapPayload } from "@/lib/teacher-route-common";
import { fetchGatewayRead } from "@/lib/gateway-read-client";

const TEACHER_BOOTSTRAP_TTL_MS = 30_000;

type CachedTeacherBootstrap = {
  expiresAt: number;
  payload: TeacherBootstrapPayload;
};

let cachedTeacherBootstrap: CachedTeacherBootstrap | null = null;
let teacherBootstrapPromise: Promise<TeacherBootstrapPayload> | null = null;

export function readCachedTeacherBootstrap() {
  if (!cachedTeacherBootstrap) {
    return null;
  }

  if (Date.now() >= cachedTeacherBootstrap.expiresAt) {
    cachedTeacherBootstrap = null;
    return null;
  }

  return cachedTeacherBootstrap.payload;
}

export async function fetchTeacherBootstrap(options: { force?: boolean } = {}) {
  if (!options.force) {
    const cached = readCachedTeacherBootstrap();
    if (cached) {
      return cached;
    }
  }

  if (!options.force && teacherBootstrapPromise) {
    return teacherBootstrapPromise;
  }

  teacherBootstrapPromise = requestTeacherBootstrap()
    .then((payload) => {
      cachedTeacherBootstrap = {
        expiresAt: Date.now() + TEACHER_BOOTSTRAP_TTL_MS,
        payload,
      };
      return payload;
    })
    .finally(() => {
      teacherBootstrapPromise = null;
    });

  return teacherBootstrapPromise;
}

export function preloadTeacherBootstrap() {
  void fetchTeacherBootstrap().catch(() => {});
}

export function invalidateTeacherBootstrap() {
  cachedTeacherBootstrap = null;
  teacherBootstrapPromise = null;
}

async function requestTeacherBootstrap() {
  const response = await fetchGatewayRead("/api/teacher/bootstrap", {
    cache: "no-store",
    fallbackToLocal: true,
  });
  const payload = (await response.json()) as TeacherBootstrapPayload;

  if (!response.ok) {
    throw new Error(payload.error || "Failed to load teacher bootstrap");
  }

  return payload;
}
