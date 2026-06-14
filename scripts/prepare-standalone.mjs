import { access, cp, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function syncStandaloneAssets(projectRoot = process.cwd()) {
  const standaloneRoot = resolve(projectRoot, ".next", "standalone");

  if (!(await exists(standaloneRoot))) {
    throw new Error(`Standalone output not found at ${standaloneRoot}`);
  }

  const copies = [
    {
      source: resolve(projectRoot, ".next", "static"),
      target: resolve(standaloneRoot, ".next", "static"),
    },
    {
      source: resolve(projectRoot, "public"),
      target: resolve(standaloneRoot, "public"),
    },
  ];

  const copied = [];

  for (const { source, target } of copies) {
    if (!(await exists(source))) {
      continue;
    }

    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, force: true });
    copied.push(target);
  }

  return { copied };
}

export async function assertStandaloneReady(projectRoot = process.cwd()) {
  const standaloneRoot = resolve(projectRoot, ".next", "standalone");
  const serverEntry = resolve(standaloneRoot, "server.js");
  const staticRoot = resolve(standaloneRoot, ".next", "static");

  if (!(await exists(standaloneRoot)) || !(await exists(serverEntry))) {
    throw new Error(
      `Standalone server output is missing at ${standaloneRoot}. Run "npm run build" before "npm start".`
    );
  }

  if (!(await exists(staticRoot))) {
    throw new Error(
      `Standalone static assets are missing at ${staticRoot}. Re-run "npm run build" to regenerate the Next.js client bundle.`
    );
  }

  return {
    standaloneRoot,
    serverEntry,
    staticRoot,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await syncStandaloneAssets();

  await assertStandaloneReady();

  if (result.copied.length > 0) {
    console.log(`Prepared standalone assets: ${result.copied.join(", ")}`);
  }
}
