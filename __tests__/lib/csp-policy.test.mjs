import test from "node:test";
import assert from "node:assert/strict";

// ─── CSP behavioral tests ──────────────────────────────────────────────────
//
// Verify the Content-Security-Policy is tightened: no bare "https:" in
// script-src or style-src, and explicit Supabase/R2 origins are included.

async function loadCspModule() {
  return import("../../lib/csp-policy.ts");
}

function withEnv(env, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return fn().finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

function parseDirective(csp, name) {
  const match = csp.match(new RegExp(`${name}\\s+([^;]+)`));
  return match ? match[1].trim() : "";
}

test("script-src does not contain bare https: in production mode", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
  const scriptSrc = parseDirective(csp, "script-src");
  assert.ok(!/\bhttps:\b/.test(scriptSrc), `script-src must not contain bare https: (got: ${scriptSrc})`);
});

test("script-src does not contain bare https: in dev mode", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: false, shouldUpgradeInsecureRequests: false });
  const scriptSrc = parseDirective(csp, "script-src");
  assert.ok(!/\bhttps:\b/.test(scriptSrc), `script-src must not contain bare https: (got: ${scriptSrc})`);
});

test("style-src does not contain bare https:", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
  const styleSrc = parseDirective(csp, "style-src");
  assert.ok(!/\bhttps:\b/.test(styleSrc), `style-src must not contain bare https: (got: ${styleSrc})`);
});

test("connect-src does not contain bare https: or wss:", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
  const connectSrc = parseDirective(csp, "connect-src");
  assert.ok(!/\bhttps:\b/.test(connectSrc), `connect-src must not contain bare https: (got: ${connectSrc})`);
  assert.ok(!/\bwss:\b/.test(connectSrc), `connect-src must not contain bare wss: (got: ${connectSrc})`);
});

test("connect-src includes explicit Supabase origin when env is set", async () => {
  await withEnv(
    { NEXT_PUBLIC_SUPABASE_URL: "https://myproject.supabase.co" },
    async () => {
      const { buildContentSecurityPolicy } = await loadCspModule();
      const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
      const connectSrc = parseDirective(csp, "connect-src");
      assert.ok(connectSrc.includes("https://myproject.supabase.co"), `connect-src should include Supabase origin (got: ${connectSrc})`);
    },
  );
});

test("connect-src includes wss: equivalent of Supabase origin for Realtime", async () => {
  await withEnv(
    { NEXT_PUBLIC_SUPABASE_URL: "https://myproject.supabase.co" },
    async () => {
      const { buildContentSecurityPolicy } = await loadCspModule();
      const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
      const connectSrc = parseDirective(csp, "connect-src");
      assert.ok(connectSrc.includes("wss://myproject.supabase.co"), `connect-src should include wss: for Realtime (got: ${connectSrc})`);
    },
  );
});

test("img-src does not contain bare https:", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
  const imgSrc = parseDirective(csp, "img-src");
  assert.ok(!/\bhttps:\b/.test(imgSrc), `img-src must not contain bare https: (got: ${imgSrc})`);
});

test("img-src includes explicit R2 public URL when env is set", async () => {
  await withEnv(
    { R2_PUBLIC_URL: "https://pub-abcd.r2.dev" },
    async () => {
      const { buildContentSecurityPolicy } = await loadCspModule();
      const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
      const imgSrc = parseDirective(csp, "img-src");
      assert.ok(imgSrc.includes("https://pub-abcd.r2.dev"), `img-src should include R2 origin (got: ${imgSrc})`);
    },
  );
});

test("object-src is none", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
  const objectSrc = parseDirective(csp, "object-src");
  assert.equal(objectSrc, "'none'");
});

test("frame-ancestors is none", async () => {
  const { buildContentSecurityPolicy } = await loadCspModule();
  const csp = buildContentSecurityPolicy({ isProduction: true, shouldUpgradeInsecureRequests: false });
  const frameAncestors = parseDirective(csp, "frame-ancestors");
  assert.equal(frameAncestors, "'none'");
});
