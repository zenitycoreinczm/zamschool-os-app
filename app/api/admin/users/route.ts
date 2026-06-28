import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../../../lib/supabase";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "../../../../lib/server-guards";
import { tenantActorRateLimitKey } from "@/lib/tenant-context";
import { requireAdminContext } from "../../../../lib/server-auth";
import { requireFeatureAccess } from "../../../../lib/feature-permissions";
import { auditDomainWrite } from "@/lib/audit-domain";
import { createAuditLog } from "@/lib/audit-log";
import {
  buildCreatedAuthUserMetadata,
  buildCreatedProfilePayload,
  generateTemporaryPassword,
} from "../../../../lib/account-state";
import {
  buildUserWritePlan,
  mergeUserDirectoryRows,
  normalizeProfileGender,
  toActiveFlag,
} from "../../../../lib/admin-user-directory";
import { loadTeacherAccountDetail } from "../../../../lib/teacher-account-detail";
import { toProtectedAvatarUrl } from "@/lib/avatar-url";
import {
  invalidateActorCaches,
  invalidateActorCachesForProfile,
} from "@/lib/invalidate-actor-caches";
import { invalidateByTag } from "@/lib/enhanced-cache";
import { roleToStoredValue } from "../../../../lib/roles";
import {
  blockedRoleCreationMessage,
  canActorCreateSchoolRole,
} from "../../../../lib/account-create-policy";
import { sendAccountCredentialsEmail } from "../../../../lib/send-account-credentials";
import { createOrUpdateAuthUserWithTemporaryPassword } from "@/lib/auth-admin-users";

const ROLE_VALUES = ["admin", "teacher", "student", "parent"] as const;

const teacherAssignmentSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
});

const createUserSchema = z.object({
  role: z.enum(ROLE_VALUES),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  profileExtras: z.record(z.string(), z.any()).optional(),
  parentExtras: z.record(z.string(), z.any()).optional(),
  specializationSubjectIds: z.array(z.string().min(1)).optional(),
  teachingAssignments: z.array(teacherAssignmentSchema).optional(),
  supervisedClassIds: z.array(z.string().min(1)).optional(),
});

const updateUserSchema = z.object({
  profileId: z.string().min(1),
  role: z.enum(["teacher", "student", "parent"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  admissionNumber: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  enrollmentDate: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  relationType: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  specializationSubjectIds: z.array(z.string().min(1)).optional(),
  teachingAssignments: z.array(teacherAssignmentSchema).optional(),
  supervisedClassIds: z.array(z.string().min(1)).optional(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "read");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this admin account" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const profileId = String(searchParams.get("profileId") || "").trim();
    const requestedRole = normalizeRoleValue(searchParams.get("role"));

    if (!profileId) {
      return NextResponse.json({
        success: true,
        data: await loadUserDirectory(schoolId),
      });
    }

    const profile = await loadPersonProfile(profileId, schoolId);
    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const role = requestedRole || normalizeRoleValue(profile.role);
    const baseProfile = {
      profileId: profile.id,
      role,
      displayName: buildDisplayName(profile),
      email: profile.email || null,
      avatarUrl: toProtectedAvatarUrl(profile.avatar_url, {
        schoolId,
        userId: profile.id,
      }),
      status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
      updatedAt: profile.updated_at || profile.created_at || null,
    };

    if (role === "student") {
      return NextResponse.json({
        success: true,
        data: await buildStudentDetail(baseProfile, schoolId),
      });
    }

    if (role === "teacher") {
      return NextResponse.json({
        success: true,
        data: await buildTeacherDetail(baseProfile, schoolId),
      });
    }

    if (role === "parent") {
      return NextResponse.json({
        success: true,
        data: await buildParentDetail(baseProfile, schoolId),
      });
    }

    return NextResponse.json({ success: true, data: baseProfile });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load user details") },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "create");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this admin account" },
        { status: 403 },
      );
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: tenantActorRateLimitKey({
        scope: "admin-users",
        schoolId,
        req,
        userId: access.context.userId,
      }),
      limit: 250,
      windowMs: 60_000,
      failOpen: true,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        },
      );
    }

    const body = await parseJsonWithSchema(req, createUserSchema);

    const role = String(body.role || "")
      .trim()
      .toLowerCase() as (typeof ROLE_VALUES)[number];
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const teacherAssignments =
      role === "teacher"
        ? await validateTeacherAssignmentInput({
            schoolId,
            specializationSubjectIds: body.specializationSubjectIds,
            teachingAssignments: body.teachingAssignments,
            supervisedClassIds: body.supervisedClassIds,
          })
        : emptyTeacherAssignmentInput();
    const profileExtras = sanitizeProfileExtras(role, {
      ...(body.profileExtras || {}),
      specialization:
        teacherAssignments.specializationSummary ||
        body.profileExtras?.specialization,
    });
    const parentExtras = sanitizeParentExtras(body.parentExtras);

    if (!ROLE_VALUES.includes(role) || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!canActorCreateSchoolRole(access.context.role, role)) {
      return NextResponse.json(
        { error: blockedRoleCreationMessage(role) },
        { status: 403 },
      );
    }

    if (role === "student") {
      const classId = String(profileExtras.class_id || "").trim();
      if (!classId) {
        return NextResponse.json(
          {
            error:
              "Every student must be assigned to a class before the account can be created.",
          },
          { status: 400 },
        );
      }
      try {
        await assertClassInSchool(schoolId, classId);
      } catch (error: unknown) {
        return NextResponse.json(
          { error: safeErrorMessage(error, "Invalid class assignment.") },
          { status: 400 },
        );
      }
    }

    if (role === "teacher") {
      const assignmentError = assertTeacherHasClassAssignments({
        teachingAssignments: teacherAssignments.teachingAssignments,
        supervisedClassIds: teacherAssignments.supervisedClassIds,
      });
      if (assignmentError) return assignmentError;
      try {
        for (const classId of [
          ...teacherAssignments.teachingAssignments.map((row) => row.classId),
          ...teacherAssignments.supervisedClassIds,
        ]) {
          await assertClassInSchool(schoolId, classId);
        }
      } catch (error: unknown) {
        return NextResponse.json(
          { error: safeErrorMessage(error, "Invalid class assignment.") },
          { status: 400 },
        );
      }
    }

    const tempPassword = generateTemporaryPassword();

    const authResult = await createOrUpdateAuthUserWithTemporaryPassword({
      email,
      temporaryPassword: tempPassword,
      userMetadata: buildCreatedAuthUserMetadata({
        firstName,
        lastName,
        role,
      }),
    });

    const authUserId = authResult.user.id;

    const profilePayload = buildCreatedProfilePayload({
      authUserId,
      schoolId,
      role,
      firstName,
      lastName,
      email,
      phone,
      profileExtras,
    });

    try {
      await safeInsert("profiles", profilePayload);
      await invalidateActorCaches(authUserId);
    } catch (profileErr) {
      if (authResult.created) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      throw profileErr;
    }

    if (role === "parent") {
      const parentPayload: Record<string, any> = {
        profile_id: authUserId,
        school_id: schoolId,
        phone,
        ...parentExtras,
      };
      await safeInsertIfTableExists("parents", parentPayload);
    }

    if (role === "teacher") {
      await safeInsertIfTableExists("teachers", {
        profile_id: authUserId,
        school_id: schoolId,
        employee_number: profileExtras.employee_id || null,
        employee_id: profileExtras.employee_id || null,
        department: profileExtras.department || null,
        specialization:
          teacherAssignments.specializationSummary ||
          profileExtras.specialization ||
          null,
        hire_date: profileExtras.hire_date || null,
        phone,
        is_active: profileExtras.is_active ?? true,
      });
      await syncTeacherSpecializationRows({
        schoolId,
        teacherProfileId: authUserId,
        subjectIds: teacherAssignments.specializationSubjectIds,
      });
      await syncTeacherClassSubjectAssignments({
        schoolId,
        teacherProfileId: authUserId,
        teachingAssignments: teacherAssignments.teachingAssignments,
      });
      await syncTeacherSupervisedClasses({
        schoolId,
        teacherProfileId: authUserId,
        supervisedClassIds: teacherAssignments.supervisedClassIds,
      });
    }

    if (role === "student") {
      const admissionStatus = profileExtras.class_id
        ? "class_assigned"
        : "registered";
      await safeInsertIfTableExists("students", {
        profile_id: authUserId,
        school_id: schoolId,
        admission_number: profileExtras.admission_number || null,
        student_number: profileExtras.admission_number || null,
        class_id: profileExtras.class_id || null,
        enrollment_date: profileExtras.enrollment_date || null,
        admission_status: admissionStatus,
        is_active: profileExtras.is_active ?? true,
      });
    }

    const emailResult = await sendAccountCredentialsEmail({
      to: email,
      firstName,
      role,
      temporaryPassword: tempPassword,
    });

    await createAuditLog({
      schoolId,
      userId: access.context.userId,
      action: `user.create.${role}`,
      entityType: "profile",
      entityId: authUserId,
      newData: { ...profilePayload, temporaryPassword: undefined },
      ipAddress: ip,
    });
    await invalidateByTag("dashboard");
    await invalidateByTag("students");

    return NextResponse.json({
      success: true,
      userId: authUserId,
      email,
      temporaryPassword: tempPassword,
      credentialsEmailSent: emailResult.success,
    });
  } catch (error: unknown) {
    console.error("Admin users POST error", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create user") },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "update");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this admin account" },
        { status: 403 },
      );
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: tenantActorRateLimitKey({
        scope: "admin-users-update",
        schoolId,
        req,
        userId: access.context.userId,
      }),
      limit: 30,
      windowMs: 60_000,
      failOpen: true,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        },
      );
    }

    const body = await parseJsonWithSchema(req, updateUserSchema);
    const role = body.role;
    const profile = await loadPersonProfile(body.profileId, schoolId);
    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }
    const shouldSyncTeacherAssignments =
      role === "teacher" &&
      (body.specializationSubjectIds !== undefined ||
        body.teachingAssignments !== undefined ||
        body.supervisedClassIds !== undefined);
    const teacherAssignments = shouldSyncTeacherAssignments
      ? await validateTeacherAssignmentInput({
          schoolId,
          specializationSubjectIds: body.specializationSubjectIds,
          teachingAssignments: body.teachingAssignments,
          supervisedClassIds: body.supervisedClassIds,
        })
      : null;

    if (role === "student") {
      const classId = String(body.classId || "").trim();
      if (!classId) {
        return NextResponse.json(
          { error: "Every student must be assigned to a class." },
          { status: 400 },
        );
      }
      try {
        await assertClassInSchool(schoolId, classId);
      } catch (error: unknown) {
        return NextResponse.json(
          { error: safeErrorMessage(error, "Invalid class assignment.") },
          { status: 400 },
        );
      }
    }

    if (role === "teacher" && teacherAssignments) {
      const assignmentError = assertTeacherHasClassAssignments({
        teachingAssignments: teacherAssignments.teachingAssignments,
        supervisedClassIds: teacherAssignments.supervisedClassIds,
      });
      if (assignmentError) return assignmentError;
      try {
        for (const classId of [
          ...teacherAssignments.teachingAssignments.map((row) => row.classId),
          ...teacherAssignments.supervisedClassIds,
        ]) {
          await assertClassInSchool(schoolId, classId);
        }
      } catch (error: unknown) {
        return NextResponse.json(
          { error: safeErrorMessage(error, "Invalid class assignment.") },
          { status: 400 },
        );
      }
    }

    const writePlan = buildUserWritePlan({
      role,
      schoolId,
      profileId: body.profileId,
      form: {
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone || "",
        gender: body.gender || "",
        status: body.status || "ACTIVE",
        admission_number: body.admissionNumber || "",
        class_id: body.classId || "",
        enrollment_date: body.enrollmentDate || "",
        employee_id: body.employeeId || "",
        department: body.department || "",
        specialization:
          teacherAssignments?.specializationSummary ||
          body.specialization ||
          "",
        hire_date: body.hireDate || "",
        relation_type: body.relationType || "",
        occupation: body.occupation || "",
      },
    });

    await safeUpdateScoped(
      "profiles",
      body.profileId,
      schoolId,
      writePlan.profile,
    );

    if (role === "student" && writePlan.roleRecord) {
      const existing = await loadStudentRecord(body.profileId, schoolId);
      if (existing?.id) {
        await safeUpdateScoped(
          "students",
          existing.id,
          schoolId,
          writePlan.roleRecord,
        );
      } else {
        await safeInsert("students", writePlan.roleRecord);
      }
    }

    if (role === "teacher" && writePlan.roleRecord) {
      const existing = await loadTeacherRecord(body.profileId, schoolId);
      if (existing?.id) {
        await safeUpdateScoped(
          "teachers",
          existing.id,
          schoolId,
          writePlan.roleRecord,
        );
      } else {
        await safeInsert("teachers", writePlan.roleRecord);
      }
      if (teacherAssignments) {
        await syncTeacherSpecializationRows({
          schoolId,
          teacherProfileId: body.profileId,
          subjectIds: teacherAssignments.specializationSubjectIds,
        });
        await syncTeacherClassSubjectAssignments({
          schoolId,
          teacherProfileId: body.profileId,
          teachingAssignments: teacherAssignments.teachingAssignments,
        });
        await syncTeacherSupervisedClasses({
          schoolId,
          teacherProfileId: body.profileId,
          supervisedClassIds: teacherAssignments.supervisedClassIds,
        });
      }
    }

    if (role === "parent" && writePlan.parentRecord) {
      const existing = await loadParentRecord(body.profileId, schoolId);
      if (existing?.id) {
        await safeUpdateScoped(
          "parents",
          existing.id,
          schoolId,
          writePlan.parentRecord,
        );
      } else {
        await safeInsert("parents", writePlan.parentRecord);
      }
    }

    await invalidateActorCachesForProfile(supabaseAdmin, body.profileId);

    await auditDomainWrite({
      schoolId,
      userId: access.context.userId,
      action: "user.updated",
      entityType: "profiles",
      entityId: body.profileId,
      oldData: {
        email: profile.email,
        role: profile.role,
        firstName: profile.first_name,
        lastName: profile.last_name,
      },
      newData: writePlan.profile,
      ipAddress: ip,
    });
    await invalidateByTag("dashboard");
    await invalidateByTag("students");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Admin users PUT error", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update user") },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "delete");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this admin account" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const profileId = String(searchParams.get("profileId") || "").trim();
    const role = normalizeRoleValue(searchParams.get("role"));

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 },
      );
    }

    const profile = await loadPersonProfile(profileId, schoolId);
    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const resolvedRole = role || normalizeRoleValue(profile.role);
    if (resolvedRole === "parent") {
      await deleteParentRecords(profileId, schoolId);
    } else if (resolvedRole === "student") {
      await supabaseAdmin
        .from("students")
        .delete()
        .eq("school_id", schoolId)
        .or(`profile_id.eq.${profileId},id.eq.${profileId}`);
    } else if (resolvedRole === "teacher") {
      await supabaseAdmin
        .from("teacher_subject_specializations")
        .delete()
        .eq("school_id", schoolId)
        .eq("teacher_profile_id", profileId);
      await supabaseAdmin
        .from("teacher_class_subject_assignments")
        .delete()
        .eq("school_id", schoolId)
        .eq("teacher_profile_id", profileId);
      await supabaseAdmin
        .from("classes")
        .update({ supervisor_id: null })
        .eq("school_id", schoolId)
        .eq("supervisor_id", profileId);
      await supabaseAdmin
        .from("teachers")
        .delete()
        .eq("school_id", schoolId)
        .or(`profile_id.eq.${profileId},id.eq.${profileId}`);
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", profileId)
      .eq("school_id", schoolId);

    if (profileError) throw profileError;

    await invalidateActorCachesForProfile(supabaseAdmin, profileId);

    const authDelete = await supabaseAdmin.auth.admin.deleteUser(profileId);
    if (
      authDelete.error &&
      !String(authDelete.error.message || "")
        .toLowerCase()
        .includes("not found")
    ) {
      throw authDelete.error;
    }

    await auditDomainWrite({
      schoolId,
      userId: access.context.userId,
      action: "user.deleted",
      entityType: "profiles",
      entityId: profileId,
      oldData: {
        email: profile.email,
        role: profile.role,
        firstName: profile.first_name,
        lastName: profile.last_name,
      },
      ipAddress: getClientIp(req),
    });
    await invalidateByTag("dashboard");
    await invalidateByTag("students");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Admin users DELETE error", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to delete user") },
      { status: 500 },
    );
  }
}

async function loadUserDirectory(schoolId: string) {
  const [profilesRes, studentsRes, teachersRes, parentsRes, classesRes] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("school_id", schoolId)
        .in("role", [
          "student",
          "STUDENT",
          "teacher",
          "TEACHER",
          "parent",
          "PARENT",
        ])
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("students").select("*").eq("school_id", schoolId),
      supabaseAdmin.from("teachers").select("*").eq("school_id", schoolId),
      supabaseAdmin.from("parents").select("*").eq("school_id", schoolId),
      supabaseAdmin
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId),
    ]);

  if (profilesRes.error) throw profilesRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (parentsRes.error && !isMissingRelationError(parentsRes.error))
    throw parentsRes.error;
  if (classesRes.error && !isMissingRelationError(classesRes.error))
    throw classesRes.error;

  const classNameById = Object.fromEntries(
    (classesRes.data || []).flatMap((row: any) => {
      const id = String(row?.id || "");
      const name = String(row?.name || "").trim();
      return id && name ? [[id, name]] : [];
    }),
  );

  return {
    ...mergeUserDirectoryRows({
      profiles: profilesRes.data || [],
      students: studentsRes.data || [],
      teachers: teachersRes.data || [],
      parents: parentsRes.data || [],
      classNameById,
    }),
  };
}

async function loadPersonProfile(profileId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, school_id, role, first_name, last_name, email, avatar_url, is_active, created_at, updated_at",
    )
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function loadStudentRecord(profileId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      "id, profile_id, admission_number, class_id, enrollment_date, admission_status, is_active",
    )
    .eq("school_id", schoolId)
    .or(`profile_id.eq.${profileId},id.eq.${profileId}`)
    .limit(1);

  if (error) return null;
  return Array.isArray(data) ? data[0] || null : data;
}

async function loadTeacherRecord(profileId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select(
      "id, profile_id, employee_id, employee_number, department, specialization, hire_date, is_active",
    )
    .eq("school_id", schoolId)
    .or(`profile_id.eq.${profileId},id.eq.${profileId}`)
    .limit(1);

  if (error) return null;
  return Array.isArray(data) ? data[0] || null : data;
}

async function loadParentRecord(profileId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("parents")
    .select("id, profile_id, phone, relation_type, occupation")
    .eq("school_id", schoolId)
    .eq("profile_id", profileId)
    .limit(1);

  if (error) return null;
  return Array.isArray(data) ? data[0] || null : data;
}

async function buildStudentDetail(baseProfile: any, schoolId: string) {
  const record = await loadStudentRecord(baseProfile.profileId, schoolId);
  return {
    ...baseProfile,
    admissionNumber: record?.admission_number || null,
    classId: record?.class_id || null,
    enrollmentDate: record?.enrollment_date || null,
    admissionStatus: record?.admission_status || "registered",
    isActive: record?.is_active ?? baseProfile.status === "ACTIVE",
  };
}

async function buildTeacherDetail(baseProfile: any, schoolId: string) {
  try {
    const detail = await loadTeacherAccountDetail({
      schoolId,
      profileId: baseProfile.profileId,
      baseProfile,
    });
    return detail;
  } catch {
    const record = await loadTeacherRecord(baseProfile.profileId, schoolId);
    return {
      ...baseProfile,
      employeeId: record?.employee_id || record?.employee_number || null,
      department: record?.department || null,
      specialization: record?.specialization || null,
      hireDate: record?.hire_date || null,
      isActive: record?.is_active ?? baseProfile.status === "ACTIVE",
    };
  }
}

async function buildParentDetail(baseProfile: any, schoolId: string) {
  const record = await loadParentRecord(baseProfile.profileId, schoolId);
  return {
    ...baseProfile,
    phone: record?.phone || baseProfile.email || null,
    relationType: record?.relation_type || null,
    occupation: record?.occupation || null,
  };
}

async function deleteParentRecords(profileId: string, schoolId: string) {
  // Find the parent record(s) for this profile so we can scope link deletion
  // to only this parent — deleting by school_id alone wipes every parent's
  // student links in the school.
  const { data: parentRows } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("school_id", schoolId)
    .eq("profile_id", profileId);

  const parentIds = (parentRows || [])
    .map((row: any) => String(row?.id || ""))
    .filter(Boolean);

  if (parentIds.length > 0) {
    await supabaseAdmin
      .from("parent_students")
      .delete()
      .eq("school_id", schoolId)
      .in("parent_id", parentIds);
  }

  await supabaseAdmin
    .from("parents")
    .delete()
    .eq("school_id", schoolId)
    .eq("profile_id", profileId);
}

async function syncTeacherSpecializationRows(input: {
  schoolId: string;
  teacherProfileId: string;
  subjectIds?: string[];
}) {
  if (!input.subjectIds) return;

  await supabaseAdmin
    .from("teacher_subject_specializations")
    .delete()
    .eq("school_id", input.schoolId)
    .eq("teacher_profile_id", input.teacherProfileId);

  for (const subjectId of input.subjectIds) {
    const { error } = await supabaseAdmin
      .from("teacher_subject_specializations")
      .insert({
        school_id: input.schoolId,
        teacher_profile_id: input.teacherProfileId,
        subject_id: subjectId,
      });
    if (error && !isMissingRelationError(error))
      console.error("sync specialization error", error);
  }
}

async function syncTeacherClassSubjectAssignments(input: {
  schoolId: string;
  teacherProfileId: string;
  teachingAssignments?: { classId: string; subjectId: string }[];
}) {
  if (!input.teachingAssignments) return;

  await supabaseAdmin
    .from("teacher_class_subject_assignments")
    .delete()
    .eq("school_id", input.schoolId)
    .eq("teacher_profile_id", input.teacherProfileId);

  for (const assignment of input.teachingAssignments) {
    const { error } = await supabaseAdmin
      .from("teacher_class_subject_assignments")
      .insert({
        school_id: input.schoolId,
        teacher_profile_id: input.teacherProfileId,
        class_id: assignment.classId,
        subject_id: assignment.subjectId,
      });
    if (error && !isMissingRelationError(error))
      console.error("sync assignment error", error);
  }
}

async function syncTeacherSupervisedClasses(input: {
  schoolId: string;
  teacherProfileId: string;
  supervisedClassIds?: string[];
}) {
  if (!input.supervisedClassIds) return;

  for (const classId of input.supervisedClassIds) {
    await supabaseAdmin
      .from("classes")
      .update({ supervisor_id: input.teacherProfileId })
      .eq("school_id", input.schoolId)
      .eq("id", classId);
  }
}

async function validateTeacherAssignmentInput(input: {
  schoolId: string;
  specializationSubjectIds?: string[];
  teachingAssignments?: { classId: string; subjectId: string }[];
  supervisedClassIds?: string[];
}) {
  const specializationSubjectIds = Array.isArray(input.specializationSubjectIds)
    ? input.specializationSubjectIds.filter(Boolean)
    : [];
  const teachingAssignments = Array.isArray(input.teachingAssignments)
    ? input.teachingAssignments.filter((a) => a.classId && a.subjectId)
    : [];
  const supervisedClassIds = Array.isArray(input.supervisedClassIds)
    ? input.supervisedClassIds.filter(Boolean)
    : [];

  for (const classId of [
    ...teachingAssignments.map((row) => row.classId),
    ...supervisedClassIds,
  ]) {
    await assertClassInSchool(input.schoolId, classId);
  }

  const specializationSummary =
    specializationSubjectIds.length > 0
      ? await resolveSubjectNames(input.schoolId, specializationSubjectIds)
      : null;

  return {
    specializationSubjectIds,
    teachingAssignments,
    supervisedClassIds,
    specializationSummary,
  };
}

function assertTeacherHasClassAssignments(input: {
  teachingAssignments: { classId: string; subjectId: string }[];
  supervisedClassIds: string[];
}) {
  if (
    input.teachingAssignments.length > 0 ||
    input.supervisedClassIds.length > 0
  ) {
    return null;
  }
  return NextResponse.json(
    {
      error:
        "Assign this teacher to at least one class — add a teaching assignment (class + subject) or a class teacher responsibility.",
    },
    { status: 400 },
  );
}

async function assertClassInSchool(schoolId: string, classId: string) {
  const normalized = String(classId || "").trim();
  if (!normalized) {
    throw new Error("Class is required.");
  }

  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("id", normalized)
    .maybeSingle();

  if (error) {
    console.error("assertClassInSchool", error);
    throw new Error("Failed to validate class assignment.");
  }

  if (!data?.id) {
    throw new Error(
      "Selected class was not found in this school. Choose a class from the list or create one first.",
    );
  }
}

function emptyTeacherAssignmentInput() {
  return {
    specializationSubjectIds: [],
    teachingAssignments: [],
    supervisedClassIds: [],
    specializationSummary: null,
  };
}

async function resolveSubjectNames(
  schoolId: string,
  subjectIds: string[],
): Promise<string | null> {
  if (subjectIds.length === 0) return null;

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("name")
    .eq("school_id", schoolId)
    .in("id", subjectIds);

  if (error || !data) return null;

  const names = data
    .map((s: any) => String(s.name || "").trim())
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : null;
}

function sanitizeProfileExtras(role: string, extras: Record<string, any>) {
  const cleaned: Record<string, any> = {};
  if (extras.employee_id)
    cleaned.employee_id = String(extras.employee_id).trim();
  if (extras.department) cleaned.department = String(extras.department).trim();
  if (extras.specialization)
    cleaned.specialization = String(extras.specialization).trim();
  if (extras.hire_date) cleaned.hire_date = String(extras.hire_date).trim();
  if (extras.admission_number)
    cleaned.admission_number = String(extras.admission_number).trim();
  if (extras.class_id) cleaned.class_id = String(extras.class_id).trim();
  if (extras.enrollment_date)
    cleaned.enrollment_date = String(extras.enrollment_date).trim();
  if (typeof extras.is_active === "boolean")
    cleaned.is_active = extras.is_active;
  return cleaned;
}

function sanitizeParentExtras(extras?: Record<string, any>) {
  if (!extras) return {};
  const cleaned: Record<string, any> = {};
  if (extras.relation_type)
    cleaned.relation_type = String(extras.relation_type).trim();
  if (extras.occupation) cleaned.occupation = String(extras.occupation).trim();
  return cleaned;
}

function buildDisplayName(profile: any): string {
  const first = String(profile?.first_name || "").trim();
  const last = String(profile?.last_name || "").trim();
  if (first || last) return `${first} ${last}`.trim();
  const name = String(profile?.name || "").trim();
  if (name) return name;
  const email = String(profile?.email || "").trim();
  if (email) return email.split("@")[0];
  return "User";
}

function normalizeRoleValue(value: any): string {
  const stored = roleToStoredValue(value);
  if (stored) return stored;

  const raw = String(value || "")
    .trim()
    .toLowerCase();
  const aliases: Record<string, string> = {
    instructor: "teacher",
    pupil: "student",
    guardian: "parent",
  };
  return aliases[raw] || raw;
}

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || "");
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("does not exist")
  );
}

async function safeInsert(table: string, payload: Record<string, any>) {
  const MAX_RETRIES = 5;
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { error } = await supabaseAdmin.from(table).insert(currentPayload);
    if (!error) return;

    const message = String(error?.message || "");
    const code = String(error?.code || "");
    if (code === "42703" || message.includes("does not exist")) {
      const match = message.match(
        /column\s+(?:[a-z_]+\.)?([a-zA-Z0-9_]+)\s+does not exist/i,
      );
      if (match && match[1] && match[1] in currentPayload) {
        delete currentPayload[match[1]];
        continue;
      }
    }
    throw error;
  }
}

async function safeInsertIfTableExists(
  table: string,
  payload: Record<string, any>,
) {
  try {
    await safeInsert(table, payload);
  } catch (error: any) {
    const message = String(error?.message || "");
    const code = String(error?.code || "");
    if (
      code === "42P01" ||
      code === "PGRST205" ||
      message.includes("does not exist")
    ) {
      return;
    }
    throw error;
  }
}

async function safeUpdateScoped(
  table: string,
  recordId: string,
  schoolId: string,
  payload: Record<string, any>,
) {
  const MAX_RETRIES = 5;
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { error } = await supabaseAdmin
      .from(table)
      .update(currentPayload)
      .eq("id", recordId)
      .eq("school_id", schoolId);
    if (!error) return;

    const message = String(error?.message || "");
    const code = String(error?.code || "");
    if (code === "42703" || message.includes("does not exist")) {
      const match = message.match(
        /column\s+(?:[a-z_]+\.)?([a-zA-Z0-9_]+)\s+does not exist/i,
      );
      if (match && match[1] && match[1] in currentPayload) {
        delete currentPayload[match[1]];
        continue;
      }
    }
    throw error;
  }
}
