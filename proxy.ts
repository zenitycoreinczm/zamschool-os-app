import {
  normalizeLegacyDashboardPath,
  resolveRoleAwareProtectedPath,
  resolvePostLoginPath,
} from "./lib/auth-routing";
import { resolveVerifiedMiddlewareSession } from "./lib/middleware-supabase-session";
import {
  buildContentSecurityPolicy,
  isProductionCspMode,
} from "./lib/csp-policy";
import { isLoopbackOrigin, resolveAllowedApiOrigin } from "./lib/cors-policy";
import { applyApiCachePolicy, applyPageCachePolicy } from "./lib/edge-cache";
import { NextResponse, type NextRequest } from "next/server";
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_TOKEN_COOKIE,
} from "./lib/csrf";

const API_CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Authorization, Content-Type";
const ALLOWED_CORS_HEADERS = [
  "Authorization",
  "Content-Type",
  "Accept",
  "Origin",
  "X-Requested-With",
  "X-CSRF-Token",
  "X-Client-Info",
].join(", ");
const SECURITY_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function canAccessPath(role: string | null | undefined, pathname: string) {
  if (!role) return false;

  // Shared protected paths accessible to all authenticated roles
  const sharedProtectedPrefixes = [
    "/app/profile",
    "/app/settings",
    "/app/messages",
    "/app/announcements",
    "/app/events",
    "/app/notifications",
  ];

  if (
    sharedProtectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  // Role-specific path restrictions
  if (pathname === "/dashboard" || pathname === "/app/dashboard")
    return role === "ADMIN";
  if (pathname.startsWith("/app/super-admin")) return role === "SUPER_ADMIN";
  if (pathname.startsWith("/app/admin") || pathname.startsWith("/admin")) {
    return [
      "ADMIN",
      "PRINCIPAL",
      "DEPUTY_HEAD",
      "BURSAR",
      "ACADEMIC_ADMIN",
      "HR_ADMIN",
      "ICT_ADMIN",
      "DISCIPLINE_ADMIN",
      "GUIDANCE_OFFICE",
      "REGISTRAR",
    ].includes(role);
  }
  if (pathname.startsWith("/app/payments") || pathname.startsWith("/payments"))
    return ["PAYMENTS", "BURSAR"].includes(role);
  if (pathname.startsWith("/app/bursar")) return role === "BURSAR";
  if (pathname.startsWith("/app/principal")) return role === "PRINCIPAL";
  if (pathname.startsWith("/app/deputy-head")) return role === "DEPUTY_HEAD";
  if (pathname.startsWith("/app/guidance")) return role === "GUIDANCE_OFFICE";
  if (pathname.startsWith("/app/academic-admin"))
    return role === "ACADEMIC_ADMIN";
  if (pathname.startsWith("/app/hr-admin")) return role === "HR_ADMIN";
  if (pathname.startsWith("/app/ict-admin")) return role === "ICT_ADMIN";
  if (pathname.startsWith("/app/registrar")) return role === "REGISTRAR";
  if (pathname.startsWith("/app/discipline-admin"))
    return role === "DISCIPLINE_ADMIN";
  if (pathname.startsWith("/teacher")) return role === "TEACHER";
  if (pathname.startsWith("/student")) return role === "STUDENT";
  if (pathname.startsWith("/parent")) return role === "PARENT";

  // Default /app paths require admin-level role
  if (pathname.startsWith("/app"))
    return [
      "ADMIN",
      "PRINCIPAL",
      "DEPUTY_HEAD",
      "BURSAR",
      "ACADEMIC_ADMIN",
      "HR_ADMIN",
      "ICT_ADMIN",
      "DISCIPLINE_ADMIN",
      "GUIDANCE_OFFICE",
      "REGISTRAR",
    ].includes(role);

  // Allow access to all other paths
  return true;
}

export async function proxy(request: NextRequest) {
  const pathname = normalizeLegacyDashboardPath(request.nextUrl.pathname);

  // RSC prefetch requests (_rsc=…) are speculative: the browser fires them when
  // the user hovers a <Link>, then aborts the request on the next navigation.
  // Running the full session/CORS/security pipeline on a cancelled prefetch
  // produces noisy `net::ERR_ABORTED` entries in the console. Serve them as a
  // plain pass-through so they short-circuit cleanly when aborted.
  const isRscPrefetch = request.nextUrl.searchParams.has("_rsc");
  if (isRscPrefetch) {
    return NextResponse.next({ request });
  }

  if (pathname.startsWith("/api/")) {
    const corsHeaders = buildApiCorsHeaders(request);

    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
      applySecurityHeaders(response, request);
      return response;
    }

    // Validate CSRF token for mutating requests on protected API routes
    // Skip public auth endpoints that are called before a CSRF cookie is established
    const publicAuthPrefixes = [
      "/api/auth/send-otp",
      "/api/auth/verify-otp",
      "/api/auth/register-school",
      "/api/auth/verify-access-code",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/complete-first-login",
      "/api/staff/invitations/accept",
      "/api/auth/mfa",
    ];
    const isPublicAuthEndpoint = publicAuthPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (mutatingMethods.includes(request.method) && !isPublicAuthEndpoint) {
      const csrfTokenFromCookie =
        request.cookies.get(CSRF_TOKEN_COOKIE)?.value || null;
      const csrfTokenFromHeader = request.headers.get("x-csrf-token") || null;
      if (!validateCsrfToken(csrfTokenFromHeader, csrfTokenFromCookie)) {
        console.warn(
          "[CSRF] Validation failed for",
          request.method,
          pathname,
          "| cookie present:",
          Boolean(csrfTokenFromCookie),
          "| header present:",
          Boolean(csrfTokenFromHeader),
          "| tokens match:",
          csrfTokenFromCookie === csrfTokenFromHeader,
        );
        const response = NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403, headers: corsHeaders },
        );
        applySecurityHeaders(response, request);
        return response;
      }
    }

    const response = NextResponse.next();
    applyCorsHeaders(response, corsHeaders);
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    applyApiCachePolicy(pathname, request.method, response);
    return response;
  }

  let response = NextResponse.next({ request });

  // Ensure CSRF cookie is set on every response, including redirects
  ensureCsrfCookie(response, request);

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/accept-invitation") ||
    pathname.startsWith("/join");
  const isFirstLoginPage = pathname.startsWith("/first-login");
  const isDashboardPage =
    isFirstLoginPage ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/payments");
  const isMfaChallengePage = pathname.startsWith("/login/mfa");
  const needsVerifiedSession =
    isDashboardPage || isAuthPage || isMfaChallengePage;

  let verified = null;
  if (needsVerifiedSession) {
    verified = await resolveVerifiedMiddlewareSession(request, response);
  }

  const hasSession = Boolean(verified?.userId);
  const role = verified?.role ?? null;
  const mustChangePassword = verified?.mustChangePassword ?? false;

  if (!hasSession && isDashboardPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirectTo",
      `${pathname}${request.nextUrl.search}`,
    );
    response = NextResponse.redirect(loginUrl);
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && pathname !== request.nextUrl.pathname) {
    response = NextResponse.redirect(
      new URL(`${pathname}${request.nextUrl.search}`, request.url),
    );
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    return response;
  }

  const canonicalRolePath = resolveRoleAwareProtectedPath(role, pathname);
  if (hasSession && canonicalRolePath !== pathname) {
    response = NextResponse.redirect(
      new URL(`${canonicalRolePath}${request.nextUrl.search}`, request.url),
    );
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    return response;
  }

  if (
    hasSession &&
    mustChangePassword &&
    isDashboardPage &&
    !isFirstLoginPage
  ) {
    response = NextResponse.redirect(new URL("/first-login", request.url));
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && isDashboardPage && role && !canAccessPath(role, pathname)) {
    response = NextResponse.redirect(
      new URL(resolvePostLoginPath(role, pathname), request.url),
    );
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && isAuthPage) {
    if (pathname.startsWith("/login")) {
      applySecurityHeaders(response, request);
      return response;
    }
    if (pathname.startsWith("/reset-password")) {
      applySecurityHeaders(response, request);
      return response;
    }

    if (
      !role &&
      (pathname.startsWith("/register") || pathname.startsWith("/verify-email"))
    ) {
      applySecurityHeaders(response, request);
      return response;
    }

    response = NextResponse.redirect(
      new URL(resolvePostLoginPath(role), request.url),
    );
    ensureCsrfCookie(response, request);
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && isDashboardPage && !isMfaChallengePage && verified) {
    if (verified.aal === "aal1" && verified.mfaEnrolled) {
      const mfaUrl = new URL("/login/mfa", request.url);
      mfaUrl.searchParams.set(
        "returnTo",
        `${pathname}${request.nextUrl.search}`,
      );
      response = NextResponse.redirect(mfaUrl);
      ensureCsrfCookie(response, request);
      applySecurityHeaders(response, request);
      return response;
    }
  }

  applySecurityHeaders(response, request);
  applyPageCachePolicy(pathname, response);
  return response;
}

function buildApiCorsHeaders(request: NextRequest) {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedApiOriginFromRequest(request);

  if (!allowedOrigin) {
    return headers;
  }

  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", API_CORS_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_CORS_HEADERS);
  headers.set("Vary", "Origin, Access-Control-Request-Headers");

  return headers;
}

function applyCorsHeaders(response: NextResponse, headers: Headers) {
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
}

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:" ||
    request.nextUrl.hostname.endsWith(".vercel.app");

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      isProduction: isProductionCspMode(),
      shouldUpgradeInsecureRequests:
        isHttps && !isLoopbackOrigin(request.nextUrl.origin),
    }),
  );

  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
}

function resolveAllowedApiOriginFromRequest(request: NextRequest) {
  return resolveAllowedApiOrigin(request.headers.get("origin"));
}

function ensureCsrfCookie(response: NextResponse, request: NextRequest) {
  const existing = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  if (!existing) {
    response.cookies.set(CSRF_TOKEN_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
