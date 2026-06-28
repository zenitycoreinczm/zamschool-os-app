import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const billingByIdSource = readFileSync(
  "app/api/payments/billing/[studentFeeId]/route.ts",
  "utf8",
);
const billingSummarySource = readFileSync(
  "app/api/payments/billing/summary/route.ts",
  "utf8",
);
const studentsSource = readFileSync(
  "app/api/payments/students/route.ts",
  "utf8",
);
const billingSource = readFileSync("app/api/payments/billing/route.ts", "utf8");
const feesSource = readFileSync("app/api/payments/fees/route.ts", "utf8");
const transactionMigrationSource = readFileSync(
  "supabase/migrations/20260627143000_add_payment_transaction_rpcs.sql",
  "utf8",
);
const shellSummarySource = readFileSync(
  "app/api/payments/shell-summary/route.ts",
  "utf8",
);

test("payments billing mutation route requires payments update permission and uses transactional rpc", () => {
  assert.match(
    billingByIdSource,
    /requireFeatureAccess\([\s\S]*access\.context,[\s\S]*"payments",[\s\S]*"update"/,
  );
  assert.match(
    billingByIdSource,
    /supabaseAdmin\.rpc\([\s\S]*"record_student_fee_payment_transaction"/,
  );
});

test("payments billing summary route requires payments read permission", () => {
  assert.match(
    billingSummarySource,
    /requireFeatureAccess\(access\.context, "payments", "read"\)/,
  );
});

test("payments students routes require feature permissions, transactional rpc, and audit logging", () => {
  assert.match(
    studentsSource,
    /requireFeatureAccess\([\s\S]*access\.context,[\s\S]*"payments",[\s\S]*"read"/,
  );
  assert.match(
    studentsSource,
    /requireFeatureAccess\([\s\S]*access\.context,[\s\S]*"payments",[\s\S]*"create"/,
  );
  assert.match(
    studentsSource,
    /supabaseAdmin\.rpc\([\s\S]*"record_student_payment_transaction"/,
  );
  assert.match(studentsSource, /auditDomainWrite\(/);
});

test("payments billing generation route requires payments create permission and audit logging", () => {
  assert.match(
    billingSource,
    /requireFeatureAccess\([\s\S]*access\.context,[\s\S]*"payments",[\s\S]*"create"/,
  );
  assert.match(billingSource, /auditDomainWrite\(/);
});

test("payments fees create route requires payments create permission and audit logging", () => {
  assert.match(
    feesSource,
    /requireFeatureAccess\([\s\S]*access\.context,[\s\S]*"payments",[\s\S]*"create"/,
  );
  assert.match(feesSource, /auditDomainWrite\(/);
});

test("payment transaction migration defines server-only transactional rpc functions", () => {
  assert.match(
    transactionMigrationSource,
    /CREATE OR REPLACE FUNCTION public\.record_student_payment_transaction\(/,
  );
  assert.match(
    transactionMigrationSource,
    /CREATE OR REPLACE FUNCTION public\.record_student_fee_payment_transaction\(/,
  );
  assert.match(
    transactionMigrationSource,
    /GRANT EXECUTE ON FUNCTION public\.record_student_payment_transaction\([\s\S]*TO service_role;/,
  );
  assert.match(
    transactionMigrationSource,
    /GRANT EXECUTE ON FUNCTION public\.record_student_fee_payment_transaction\([\s\S]*TO service_role;/,
  );
});

test("payments shell summary route requires payments read permission", () => {
  assert.match(
    shellSummarySource,
    /requireFeatureAccess\([\s\S]*access\.context,[\s\S]*"payments",[\s\S]*"read"/,
  );
});
