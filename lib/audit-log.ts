import { supabaseAdmin } from "@/lib/supabase";

export async function createAuditLog(params: {
  schoolId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      school_id: params.schoolId || null,
      user_id: params.userId,
      action: params.action,
      resource_type: params.entityType,
      entity_type: params.entityType,
      entity_id: isUuid(params.entityId) ? params.entityId : null,
      old_data: params.oldData || null,
      new_data:
        params.entityId && !isUuid(params.entityId)
          ? { ...(params.newData || {}), entity_key: params.entityId }
          : params.newData || null,
      ip_address: params.ipAddress || null,
    });

    if (error) {
      const isSchemaMissing =
        error.code === "PGRST204" ||
        /Could not find.*column.*in the schema cache/i.test(error.message);

      if (isSchemaMissing) {
        console.warn(
          "Audit log skipped – schema cache mismatch (migration not applied):",
          error.message,
        );
      } else {
        console.error("Failed to create audit log:", error);
      }
    }
  } catch (err) {
    console.error("Failed to create audit log (non-blocking):", err);
  }
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
  );
}
