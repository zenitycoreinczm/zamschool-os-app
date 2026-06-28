import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const apiRoot = join(root, "app", "api");
const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
const exemptionsPath = join(root, "eslint-rules", "route-audit-exemptions.json");

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (/route\.(ts|tsx)$/.test(entry.name)) {
      yield path;
    }
  }
}

function hasMutation(source) {
  return mutationMethods.some((method) =>
    new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`).test(source),
  );
}

function exportedMutations(source) {
  return mutationMethods.filter((method) =>
    new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`).test(source),
  );
}

/** Load the exemptions file. Returns a Map<routePath, Set<exemptChecks>>. */
async function loadExemptions() {
  let exemptions;
  try {
    const raw = await readFile(exemptionsPath, "utf8");
    exemptions = JSON.parse(raw).exemptions;
  } catch {
    return new Map();
  }

  const map = new Map();
  for (const [route, checks] of Object.entries(exemptions)) {
    // Normalize path separators to forward slashes for cross-platform matching
    const normalized = route.replaceAll("\\", "/");
    map.set(normalized, new Set(checks));
  }
  return map;
}

const exemptions = await loadExemptions();

const rows = [];

for await (const file of walk(apiRoot)) {
  const source = await readFile(file, "utf8");
  if (!hasMutation(source)) continue;

  const routePath = relative(root, file).replaceAll("\\", "/");
  const exemptChecks = exemptions.get(routePath) || new Set();

  rows.push({
    route: routePath,
    methods: exportedMutations(source).join(","),
    auth:
      /require\w*Context\s*\(|enforceRouteAccess\s*\(/.test(source),
    feature:
      /requireFeatureAccess\s*\(|enforceRouteAccess\s*\([^]*feature\s*:/.test(source),
    domain:
      /assertDomainAccess\s*\(|enforceRouteAccess\s*\([^]*domain\s*:/.test(source),
    workflow: /authorizeWorkflowTransition\s*\(/.test(source),
    audit: /createAuditLog\s*\(|auditDomainWrite\s*\(/.test(source),
    exempt: exemptChecks.size > 0 ? Array.from(exemptChecks).join(",") : "",
  });
}

const weak = rows.filter((row) => {
  const route = row.route;
  const exempt = exemptions.get(route) || new Set();

  const missingAuth = !row.auth && !exempt.has("auth");
  const missingFeature = !row.feature && !exempt.has("feature");
  const missingAudit = !row.audit && !exempt.has("audit");

  return missingAuth || missingFeature || missingAudit;
});

console.table(rows);

if (weak.length > 0) {
  console.error("\nRoutes needing enforcement review:");
  for (const row of weak) {
    const route = row.route;
    const exempt = exemptions.get(route) || new Set();
    const missing = [
      !row.auth && !exempt.has("auth") && "auth",
      !row.feature && !exempt.has("feature") && "feature",
      !row.audit && !exempt.has("audit") && "audit",
    ].filter(Boolean);
    console.error(`- ${route} (${row.methods}) missing ${missing.join(", ")}`);
  }
  process.exitCode = 1;
} else {
  const exemptCount = rows.filter((r) => r.exempt).length;
  console.log(
    `\nAll ${rows.length} mutation routes include auth, feature checks, and audit calls (${exemptCount} with documented exemptions).`,
  );
}
