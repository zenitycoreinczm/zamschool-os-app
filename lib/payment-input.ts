import { z } from "zod";

export const studentPaymentInputSchema = z.object({
  student_id: z.string().uuid(),
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero.").max(1_000_000),
  payment_type: z.string().trim().min(1).max(64),
  payment_method: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().trim().min(1).max(64).optional()
  ),
  reference_number: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().trim().max(120).optional()
  ),
});

export const billingGenerateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "month must be in YYYY-MM-01 format"),
  fee_id: z.string().uuid().optional(),
});

export const manualPaymentSchema = z.object({
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero.").max(1_000_000),
  payment_method: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().trim().min(1).max(64).optional()
  ),
  reference_number: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().trim().max(120).optional()
  ),
});

export function parseStudentPaymentInput(input: unknown) {
  const payload = studentPaymentInputSchema.parse(input);

  return {
    studentId: payload.student_id,
    amount: payload.amount,
    paymentType: payload.payment_type,
    paymentMethod: payload.payment_method || "cash",
    referenceNumber: payload.reference_number || null,
  };
}

export function parseBillingGenerateInput(input: unknown) {
  return billingGenerateSchema.parse(input);
}

export function parseManualPaymentInput(input: unknown) {
  const payload = manualPaymentSchema.parse(input);
  return {
    amount: payload.amount,
    paymentMethod: payload.payment_method || "cash",
    referenceNumber: payload.reference_number || null,
  };
}

export const feeSchema = z.object({
  name: z.string().min(1, "Fee name is required").max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive("Amount must be positive").max(1000000),
  currency: z.string().default("ZMW").optional(),
  frequency: z.enum(["monthly", "termly", "once-off"]).default("monthly"),
});

export const feeUpdateSchema = feeSchema.partial();
