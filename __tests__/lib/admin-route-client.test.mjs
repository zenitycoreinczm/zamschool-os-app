import { importTsModule } from "../../scripts/test-ts-module.mjs";

const { adminGet, buildFinanceMutationPayload, parseAdminRouteResponse } =
  await importTsModule("../../lib/admin-route-client.ts", import.meta.url);

import test from "node:test";
import assert from "node:assert/strict";

test("parseAdminRouteResponse throws the route error message", async () => {
  const response = new Response(
    JSON.stringify({ error: "Failed to fetch finance records" }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );

  await assert.rejects(
    () => parseAdminRouteResponse(response),
    /Failed to fetch finance records/,
  );
});

test("adminGet sends a GET request with credentials included", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const payload = await adminGet("/api/admin/finance");
    assert.deepEqual(payload, { success: true, data: [] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.credentials, "include");
    assert.equal(calls[0].init.cache, "no-store");
    assert.equal(calls[0].init.headers.get("Authorization"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("buildFinanceMutationPayload maps the finance form to the route contract", () => {
  assert.deepEqual(
    buildFinanceMutationPayload({
      type: "expense",
      category: "Transport",
      amount: "120",
      description: "Fuel",
      transaction_date: "2026-03-26",
    }),
    {
      transactionType: "expense",
      category: "Transport",
      amount: 120,
      description: "Fuel",
      transactionDate: "2026-03-26",
    },
  );
});
