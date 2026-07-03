import test from "node:test";
import assert from "node:assert/strict";

import { safeErrorMessage } from "../../lib/safe-error.ts";

test("safeErrorMessage extracts message from Error instance", () => {
  assert.equal(safeErrorMessage(new Error("Database connection failed")), "Database connection failed");
});

test("safeErrorMessage passes through non-empty string errors", () => {
  assert.equal(safeErrorMessage("string error"), "string error");
});

test("safeErrorMessage extracts message from plain objects (Supabase/PostgREST)", () => {
  assert.equal(
    safeErrorMessage({ message: "row-level security violation", code: "42501" }),
    "row-level security violation",
  );
});

test("safeErrorMessage returns fallback for messageless values", () => {
  assert.equal(safeErrorMessage(42), "An unexpected error occurred");
  assert.equal(safeErrorMessage(null), "An unexpected error occurred");
  assert.equal(safeErrorMessage(undefined), "An unexpected error occurred");
  assert.equal(safeErrorMessage(""), "An unexpected error occurred");
  assert.equal(safeErrorMessage({ code: 500 }), "An unexpected error occurred");
});

test("safeErrorMessage returns fallback for Error with empty message", () => {
  const err = new Error("");
  assert.equal(safeErrorMessage(err), "An unexpected error occurred");
});

test("safeErrorMessage accepts custom fallback", () => {
  assert.equal(safeErrorMessage(null, "Payment processing failed"), "Payment processing failed");
  assert.equal(safeErrorMessage({}, "Custom fallback"), "Custom fallback");
});

test("safeErrorMessage uses custom fallback even for Error with empty message", () => {
  assert.equal(safeErrorMessage(new Error(""), "Custom fallback"), "Custom fallback");
});
