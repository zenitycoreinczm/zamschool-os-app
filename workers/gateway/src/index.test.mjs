import test from "node:test";
import assert from "node:assert/strict";

import { importTsDefault } from "../../../scripts/test-ts-module.mjs";

const worker = await importTsDefault("./index.ts", import.meta.url);

function createBucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, value, options) {
      objects.set(key, { value, options });
    },
    async get(key) {
      const object = objects.get(key);
      if (!object) return null;
      return {
        body: object.value,
        httpMetadata: object.options?.httpMetadata,
      };
    },
  };
}

function createEnv(upstreamHandler) {
  const assets = createBucket();
  const uploads = createBucket();
  return {
    ASSETS_BUCKET: assets,
    UPLOADS_BUCKET: uploads,
    UPSTREAM_API: "https://app.example.test",
    CORS_ALLOWED_ORIGINS: "https://school.example.test",
    fetch: upstreamHandler,
    __assets: assets,
    __uploads: uploads,
  };
}

async function postUpload(env, formData, headers = {}) {
  return worker.fetch(
    new Request("https://gateway.example.test/api/upload", {
      method: "POST",
      headers: {
        Origin: "https://school.example.test",
        Authorization: "Bearer valid-token",
        ...headers,
      },
      body: formData,
    }),
    env
  );
}

test("preflight only allows configured origins", async () => {
  const env = createEnv(async () => new Response("unused"));

  const allowed = await worker.fetch(
    new Request("https://gateway.example.test/api/upload", {
      method: "OPTIONS",
      headers: { Origin: "https://school.example.test" },
    }),
    env
  );
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://school.example.test");

  const denied = await worker.fetch(
    new Request("https://gateway.example.test/api/upload", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.test" },
    }),
    env
  );
  assert.equal(denied.headers.has("Access-Control-Allow-Origin"), false);
});

test("upload rejects missing bearer token", async () => {
  const env = createEnv(async () => new Response("unused"));
  const formData = new FormData();
  formData.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));
  formData.set("entityType", "document");

  const res = await postUpload(env, formData, { Authorization: "" });

  assert.equal(res.status, 401);
});

test("upload rejects upstream authorization failure", async () => {
  const env = createEnv(async () => new Response("Forbidden", { status: 403 }));
  const formData = new FormData();
  formData.set("file", new File(["hello"], "note.pdf", { type: "application/pdf" }));
  formData.set("entityType", "document");

  const res = await postUpload(env, formData);

  assert.equal(res.status, 403);
  assert.equal(env.__uploads.objects.size, 0);
});

test("upload ignores client path and stores with upstream-authorized key", async () => {
  const env = createEnv(async (req) => {
    assert.equal(req.url, "https://app.example.test/api/files/authorize-upload");
    assert.equal(req.headers.get("Authorization"), "Bearer valid-token");
    const body = await req.json();
    assert.equal(body.filename, "note.pdf");
    assert.equal(body.entityType, "document");
    assert.equal(body.size, 5);
    return Response.json({
      bucket: "uploads",
      key: "school-1/document/user-1/authorized-note.pdf",
      url: "https://cdn.example.test/school-1/document/user-1/authorized-note.pdf",
    });
  });

  const formData = new FormData();
  formData.set("file", new File(["hello"], "note.pdf", { type: "application/pdf" }));
  formData.set("entityType", "document");
  formData.set("path", "../../attacker-controlled.pdf");

  const res = await postUpload(env, formData);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.key, "school-1/document/user-1/authorized-note.pdf");
  assert.equal(env.__uploads.objects.has("school-1/document/user-1/authorized-note.pdf"), true);
  assert.equal(env.__uploads.objects.has("../../attacker-controlled.pdf"), false);
});
