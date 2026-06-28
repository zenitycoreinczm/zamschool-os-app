import {
  CACHEABLE_GET_PREFIXES,
  isCacheableGetPath,
  isQueuableMutationPath,
  QUEUABLE_MUTATION_PATHS,
} from "./types.ts";

export type GatewayRouteKind =
  | "upload"
  | "file_download"
  | "cached_get_proxy"
  | "get_proxy"
  | "queued_mutation"
  | "mutation"
  | "not_found";

export interface GatewayRouteMatch {
  kind: GatewayRouteKind;
  pathname: string;
  cacheable: boolean;
  queuable: boolean;
}

/**
 * Route map for the Next.js API proxy pattern.
 * Worker path === Next.js `/api/*` path (no rewrite prefix).
 */
export function matchGatewayRoute(pathname: string, method: string): GatewayRouteMatch {
  const cacheable = method === "GET" && isCacheableGetPath(pathname);
  const queuable = method !== "GET" && isQueuableMutationPath(pathname);

  if (pathname === "/api/upload" && method === "POST") {
    return { kind: "upload", pathname, cacheable: false, queuable: false };
  }

  if (pathname.startsWith("/api/files/") && method === "GET") {
    return { kind: "file_download", pathname, cacheable: false, queuable: false };
  }

  if (method === "GET" && pathname.startsWith("/api/")) {
    return {
      kind: cacheable ? "cached_get_proxy" : "get_proxy",
      pathname,
      cacheable,
      queuable: false,
    };
  }

  if (method !== "GET" && pathname.startsWith("/api/")) {
    return {
      kind: queuable ? "queued_mutation" : "mutation",
      pathname,
      cacheable: false,
      queuable,
    };
  }

  return { kind: "not_found", pathname, cacheable: false, queuable: false };
}

/** Human-readable route map for README / wrangler comments. */
export const ROUTE_MAP_DOC = {
  upload: "POST /api/upload → authorize via Next.js, store in R2",
  fileDownload: "GET /api/files/:key → serve from UPLOADS_BUCKET",
  cachedGetProxy: `GET cacheable /api/* → proxy to UPSTREAM_API + edge cache (${CACHEABLE_GET_PREFIXES.length} prefixes)`,
  getProxy: "GET other /api/* → proxy to UPSTREAM_API (no cache)",
  queuedMutation: `POST|PUT|PATCH|DELETE queuable /api/* → upstream or DO queue (${QUEUABLE_MUTATION_PATHS.length} paths)`,
  mutation: "POST|PUT|PATCH|DELETE other /api/* → proxy to UPSTREAM_API only",
} as const;
