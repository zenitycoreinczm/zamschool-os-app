import { importTsModule } from "../../../scripts/test-ts-module.mjs";

const { checkGatewayRateLimit, GATEWAY_RATE_LIMITS } = await importTsModule("./rate-limit.ts", import.meta.url);

import test from "node:test";
import assert from "node:assert/strict";
function createRateLimitKv() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value, options) {
      store.set(key, value);
      return options;
    },
  };
}

test("rate limit allows requests under max when enabled", async () => {
  const env = {
    RATE_LIMIT_ENABLED: "true",
    RATE_LIMITS: createRateLimitKv(),
  };

  const config = { ...GATEWAY_RATE_LIMITS.read, maxRequests: 3 };
  const first = await checkGatewayRateLimit(env, "school-1:user-1", config);
  const second = await checkGatewayRateLimit(env, "school-1:user-1", config);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 1);
});

test("rate limit blocks when max exceeded", async () => {
  const env = {
    RATE_LIMIT_ENABLED: "true",
    RATE_LIMITS: createRateLimitKv(),
  };

  const config = { ...GATEWAY_RATE_LIMITS.upload, maxRequests: 2 };

  await checkGatewayRateLimit(env, "ip-1", config);
  await checkGatewayRateLimit(env, "ip-1", config);
  const blocked = await checkGatewayRateLimit(env, "ip-1", config);

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test("rate limit is no-op when RATE_LIMIT_ENABLED is not true", async () => {
  const env = {
    RATE_LIMIT_ENABLED: "false",
    RATE_LIMITS: createRateLimitKv(),
  };

  const config = { ...GATEWAY_RATE_LIMITS.mutation, maxRequests: 1 };

  for (let i = 0; i < 5; i++) {
    const result = await checkGatewayRateLimit(env, "school-1:user-1", config);
    assert.equal(result.allowed, true);
  }
});
