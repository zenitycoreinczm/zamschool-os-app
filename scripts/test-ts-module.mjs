/**
 * Load TypeScript modules under the Node test runner (tsx).
 * Named ESM imports from .ts often fail; this unwraps default-export interop.
 */
export function unwrapTsModule(namespace) {
  if (
    namespace?.default &&
    typeof namespace.default === "object" &&
    Object.keys(namespace).length === 1
  ) {
    return namespace.default;
  }

  if (namespace?.default && typeof namespace.default === "object") {
    const namedKeys = Object.keys(namespace).filter((key) => key !== "default");
    if (namedKeys.length === 0) {
      return namespace.default;
    }
  }

  return namespace;
}

export async function importTsModule(relativePath, fromUrl = import.meta.url) {
  const href = new URL(relativePath, fromUrl).href;
  const raw = await import(href);
  return unwrapTsModule(raw);
}

/** Default export from a TypeScript module (Workers, etc.). */
export async function importTsDefault(relativePath, fromUrl = import.meta.url) {
  const mod = await importTsModule(relativePath, fromUrl);
  if (typeof mod === "function") {
    return mod;
  }
  if (mod?.default !== undefined) {
    return mod.default;
  }
  return mod;
}