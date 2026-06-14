import { supabaseAdmin } from "@/lib/supabase";
import { DEFAULT_PERMISSION_GROUPS } from "@/lib/permission-group-defaults";
import { roleToStoredValue } from "@/lib/roles";

const DEFAULT_DEPARTMENTS = [
  { name: "Administration", description: "School administration and leadership" },
  { name: "Academic", description: "Academic affairs and curriculum" },
  { name: "Finance", description: "Financial management and accounting" },
  { name: "ICT", description: "Information and communications technology" },
  { name: "Guidance & Counseling", description: "Student welfare and guidance" },
  { name: "Human Resources", description: "Staff management and HR" },
  { name: "Discipline", description: "Student discipline and conduct" },
  { name: "Sports & Culture", description: "Sports, arts and cultural activities" },
];

const DEFAULT_SETTINGS = [
  { key: "academic_year_format", value: { format: "YYYY-YYYY", example: "2025-2026" } },
  { key: "grading_system", value: { type: "percentage", pass_mark: 50 } },
  { key: "attendance_tracking", value: { per_lesson: true, per_day: false } },
  { key: "parent_portal", value: { enabled: true, can_view_grades: true, can_view_attendance: true, can_view_fees: true } },
  { key: "student_portal", value: { enabled: true, can_view_grades: true, can_view_timetable: true } },
  { key: "notifications", value: { email: true, in_app: true, sms: false } },
  { key: "mfa_required", value: { super_admin: true, principal: true, bursar: true, ict_admin: true } },
  { key: "tenant_isolation", value: { school_is_tenant: true, direct_cross_school_access: false } },
];

type InitResult = Record<string, { status: string; count?: number; error?: string }>;

export async function initializeSchoolDefaults(schoolId: string): Promise<InitResult> {
  const results: InitResult = {};

  const { data: existingDepartments } = await supabaseAdmin
    .from("school_departments")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1);

  if (!existingDepartments || existingDepartments.length === 0) {
    const { data, error } = await supabaseAdmin
      .from("school_departments")
      .insert(
        DEFAULT_DEPARTMENTS.map((department, index) => ({
          school_id: schoolId,
          name: department.name,
          description: department.description,
          is_default: index === 0,
        }))
      )
      .select("id");

    results.departments = error
      ? { status: "error", error: error.message }
      : { status: "created", count: data?.length || 0 };
  } else {
    results.departments = { status: "skipped", count: existingDepartments.length };
  }

  const { data: existingGroups } = await supabaseAdmin
    .from("permission_groups")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1);

  if (!existingGroups || existingGroups.length === 0) {
    let created = 0;
    for (const group of DEFAULT_PERMISSION_GROUPS) {
      const { data: groupData, error: groupError } = await supabaseAdmin
        .from("permission_groups")
        .insert({
          school_id: schoolId,
          name: group.name,
          description: group.description,
          is_system: true,
        })
        .select("id")
        .single();

      if (groupError || !groupData) {
        results.permissions = { status: "error", error: groupError?.message || "Failed to create permission group" };
        continue;
      }

      created++;
      await supabaseAdmin.from("permission_group_roles").insert(
        group.roles.flatMap((role) => {
          const storedRole = roleToStoredValue(role);
          return storedRole
            ? [{ school_id: schoolId, group_id: groupData.id, role: storedRole }]
            : [];
        })
      );

      await supabaseAdmin.from("permission_features").insert(
        group.features.map((feature) => ({
          school_id: schoolId,
          group_id: groupData.id,
          ...feature,
        }))
      );
    }
    if (!results.permissions) {
      results.permissions = { status: "created", count: created };
    }
  } else {
    results.permissions = { status: "skipped", count: existingGroups.length };
  }

  const { data: existingSettings } = await supabaseAdmin
    .from("school_settings")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1);

  if (!existingSettings || existingSettings.length === 0) {
    const { error } = await supabaseAdmin.from("school_settings").insert(
      DEFAULT_SETTINGS.map((setting) => ({
        school_id: schoolId,
        setting_key: setting.key,
        setting_value: setting.value,
      }))
    );

    results.settings = error
      ? { status: "error", error: error.message }
      : { status: "created", count: DEFAULT_SETTINGS.length };
  } else {
    results.settings = { status: "skipped", count: existingSettings.length };
  }

  return results;
}
