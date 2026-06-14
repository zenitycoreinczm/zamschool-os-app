import { createAuditLog } from "@/lib/audit-log";

export type AuditDomainWriteInput = {
  schoolId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

/**
 * Standard audit wrapper for charter "every authoritative write is logged".
 */
export async function auditDomainWrite(input: AuditDomainWriteInput): Promise<void> {
  if (!input.userId) return;

  await createAuditLog({
    schoolId: input.schoolId,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? undefined,
    oldData: (input.oldData || undefined) as Record<string, any> | undefined,
    newData: (input.newData || undefined) as Record<string, any> | undefined,
    ipAddress: input.ipAddress ?? undefined,
  });
}