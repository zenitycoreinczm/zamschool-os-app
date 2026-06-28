import test from "node:test";
import assert from "node:assert/strict";

import {
  parseStudentPaymentInput,
  parseBillingGenerateInput,
  parseManualPaymentInput,
  studentPaymentInputSchema,
  billingGenerateSchema,
  feeSchema,
  feeUpdateSchema,
} from "../../lib/payment-input.ts";

// ─── parseStudentPaymentInput ─────────────────────────────────────────────

test("parseStudentPaymentInput accepts a valid payload with all fields", () => {
  const result = parseStudentPaymentInput({
    student_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 500,
    payment_type: "tuition",
    payment_method: "bank_transfer",
    reference_number: "REF-001",
  });
  assert.equal(result.studentId, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(result.amount, 500);
  assert.equal(result.paymentType, "tuition");
  assert.equal(result.paymentMethod, "bank_transfer");
  assert.equal(result.referenceNumber, "REF-001");
});

test("parseStudentPaymentInput defaults payment_method to cash when omitted", () => {
  const result = parseStudentPaymentInput({
    student_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 100,
    payment_type: "tuition",
  });
  assert.equal(result.paymentMethod, "cash");
});

test("parseStudentPaymentInput defaults reference_number to null when omitted", () => {
  const result = parseStudentPaymentInput({
    student_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 100,
    payment_type: "tuition",
  });
  assert.equal(result.referenceNumber, null);
});

test("parseStudentPaymentInput trims whitespace from payment_method and reference_number", () => {
  const result = parseStudentPaymentInput({
    student_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 100,
    payment_type: "tuition",
    payment_method: "  cash  ",
    reference_number: "  REF-001  ",
  });
  assert.equal(result.paymentMethod, "cash");
  assert.equal(result.referenceNumber, "REF-001");
});

test("parseStudentPaymentInput coerces string amount to number", () => {
  const result = parseStudentPaymentInput({
    student_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: "250.50",
    payment_type: "tuition",
  });
  assert.equal(result.amount, 250.50);
});

test("parseStudentPaymentInput rejects zero amount", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 0,
      payment_type: "tuition",
    }),
  );
});

test("parseStudentPaymentInput rejects negative amount", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: -50,
      payment_type: "tuition",
    }),
  );
});

test("parseStudentPaymentInput rejects amount over 1,000,000", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 1_000_001,
      payment_type: "tuition",
    }),
  );
});

test("parseStudentPaymentInput rejects invalid student_id (not UUID)", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "not-a-uuid",
      amount: 100,
      payment_type: "tuition",
    }),
  );
});

test("parseStudentPaymentInput rejects missing payment_type", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 100,
    }),
  );
});

test("parseStudentPaymentInput rejects empty payment_type after trim", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 100,
      payment_type: "   ",
    }),
  );
});

test("parseStudentPaymentInput rejects NaN amount", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: NaN,
      payment_type: "tuition",
    }),
  );
});

test("parseStudentPaymentInput rejects Infinity amount", () => {
  assert.throws(() =>
    parseStudentPaymentInput({
      student_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: Infinity,
      payment_type: "tuition",
    }),
  );
});

// ─── parseBillingGenerateInput ────────────────────────────────────────────

test("parseBillingGenerateInput accepts valid YYYY-MM-01 format", () => {
  const result = parseBillingGenerateInput({ month: "2026-03-01", fee_id: "550e8400-e29b-41d4-a716-446655440000" });
  assert.deepEqual(result, { month: "2026-03-01", fee_id: "550e8400-e29b-41d4-a716-446655440000" });
});

test("parseBillingGenerateInput accepts month without fee_id", () => {
  const result = parseBillingGenerateInput({ month: "2026-01-01" });
  assert.equal(result.month, "2026-01-01");
  assert.equal(result.fee_id, undefined);
});

test("parseBillingGenerateInput rejects month not on the 1st", () => {
  assert.throws(() => parseBillingGenerateInput({ month: "2026-03-15" }));
});

test("parseBillingGenerateInput rejects month with wrong format", () => {
  assert.throws(() => parseBillingGenerateInput({ month: "2026-3-1" }));
  assert.throws(() => parseBillingGenerateInput({ month: "March 2026" }));
});

// ─── parseManualPaymentInput ──────────────────────────────────────────────

test("parseManualPaymentInput accepts valid input", () => {
  const result = parseManualPaymentInput({ amount: 500, payment_method: "mobile_money", reference_number: "MOB-001" });
  assert.equal(result.amount, 500);
  assert.equal(result.paymentMethod, "mobile_money");
  assert.equal(result.referenceNumber, "MOB-001");
});

test("parseManualPaymentInput defaults payment_method to cash", () => {
  const result = parseManualPaymentInput({ amount: 200 });
  assert.equal(result.paymentMethod, "cash");
  assert.equal(result.referenceNumber, null);
});

test("parseManualPaymentInput rejects zero or negative amount", () => {
  assert.throws(() => parseManualPaymentInput({ amount: 0 }));
  assert.throws(() => parseManualPaymentInput({ amount: -1 }));
});

// ─── feeSchema ────────────────────────────────────────────────────────────

test("feeSchema accepts a valid fee with all fields", () => {
  const result = feeSchema.parse({
    name: "Tuition",
    description: "Termly tuition",
    amount: 2000,
    currency: "ZMW",
    frequency: "termly",
  });
  assert.equal(result.name, "Tuition");
  assert.equal(result.frequency, "termly");
});

test("feeSchema defaults frequency to monthly when omitted", () => {
  const result = feeSchema.parse({ name: "Transport", amount: 300 });
  assert.equal(result.frequency, "monthly");
});

test("feeSchema rejects invalid frequency enum", () => {
  assert.throws(() => feeSchema.parse({ name: "X", amount: 100, frequency: "weekly" }));
});

test("feeSchema rejects empty name", () => {
  assert.throws(() => feeSchema.parse({ name: "", amount: 100 }));
});

test("feeSchema rejects negative amount", () => {
  assert.throws(() => feeSchema.parse({ name: "X", amount: -10 }));
});

test("feeUpdateSchema allows partial updates", () => {
  const result = feeUpdateSchema.parse({ amount: 500 });
  assert.equal(result.amount, 500);
  assert.equal(result.name, undefined);
});
