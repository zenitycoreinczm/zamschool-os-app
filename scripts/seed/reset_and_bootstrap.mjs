import { spawnSync } from "node:child_process";

const steps = [
  ["node", ["apply-migration-supabase.js"]],
  ["node", ["seed.js"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("Bootstrap complete.");
