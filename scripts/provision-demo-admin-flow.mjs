import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const env = {
  ...readEnvFile(path.join(projectRoot, ".env.local")),
  ...process.env,
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = env.DEMO_BASE_URL || "http://localhost:3001";

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase environment values in .env.local");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = buildStamp();
const adminEmail = `demo.admin.${stamp}@example.com`;
const adminPassword = buildPassword("Admin");
const schoolCode = `D${stamp.slice(-7)}`.toUpperCase();

const teacherSeed = {
  firstName: "Demo",
  lastName: "Teacher",
  email: `demo.teacher.${stamp}@example.com`,
  phone: "+260970000101",
  employee_id: `T-${stamp.slice(-6)}`,
  department: "Academics",
  specialization: "English",
  hire_date: "2026-01-15",
};

const parentSeed = {
  firstName: "Demo",
  lastName: "Parent",
  email: `demo.parent.${stamp}@example.com`,
  phone: "+260970000102",
  relation_type: "Guardian",
  occupation: "Entrepreneur",
};

const studentSeed = {
  firstName: "Demo",
  lastName: "Student",
  email: `demo.student.${stamp}@example.com`,
  phone: "+260970000103",
  admission_number: `ADM-${stamp.slice(-6)}`,
  enrollment_date: "2026-01-20",
};

const schoolSeed = {
  email: adminEmail,
  schoolName: `Demo Academy ${stamp.slice(-4)}`,
  schoolCode,
  adminName: "Demo Admin",
  phone: "+260970000100",
  address: "Demo Campus, Lusaka",
  logoUrl: "",
  emisCode: `EMIS-${stamp.slice(-6)}`,
  province: "Lusaka",
  district: "Lusaka",
  schoolType: "Secondary",
  ownershipType: "Private",
};

async function main() {
  const adminAuth = await adminSupabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      role: "ADMIN",
      admin_name: schoolSeed.adminName,
      first_name: "Demo",
      last_name: "Admin",
    },
  });

  if (adminAuth.error || !adminAuth.data.user) {
    throw new Error(adminAuth.error?.message || "Failed to create demo admin auth user");
  }

  const login = await clientSupabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (login.error || !login.data.session) {
    throw new Error(login.error?.message || "Failed to sign in demo admin");
  }

  const token = login.data.session.access_token;

  await apiFetch("/api/auth/register-school", token, {
    method: "POST",
    body: JSON.stringify(schoolSeed),
  });

  const schoolProfile = await getProfile(adminAuth.data.user.id);
  if (!schoolProfile?.school_id) {
    throw new Error("Admin profile was not linked to a school after registration");
  }

  const teacher = await apiFetch("/api/admin/users", token, {
    method: "POST",
    body: JSON.stringify({
      role: "teacher",
      firstName: teacherSeed.firstName,
      lastName: teacherSeed.lastName,
      email: teacherSeed.email,
      phone: teacherSeed.phone,
      profileExtras: {
        employee_id: teacherSeed.employee_id,
        department: teacherSeed.department,
        specialization: teacherSeed.specialization,
        hire_date: teacherSeed.hire_date,
        status: "ACTIVE",
      },
    }),
  });

  const klass = await apiFetch("/api/admin/classes", token, {
    method: "POST",
    body: JSON.stringify({
      gradeLevel: 7,
      name: `Grade 7A ${stamp.slice(-2)}`,
      capacity: 35,
      supervisorId: teacher.userId,
    }),
  });

  const parent = await apiFetch("/api/admin/users", token, {
    method: "POST",
    body: JSON.stringify({
      role: "parent",
      firstName: parentSeed.firstName,
      lastName: parentSeed.lastName,
      email: parentSeed.email,
      phone: parentSeed.phone,
      profileExtras: {
        status: "ACTIVE",
      },
      parentExtras: {
        relation_type: parentSeed.relation_type,
        occupation: parentSeed.occupation,
      },
    }),
  });

  const student = await apiFetch("/api/admin/users", token, {
    method: "POST",
    body: JSON.stringify({
      role: "student",
      firstName: studentSeed.firstName,
      lastName: studentSeed.lastName,
      email: studentSeed.email,
      phone: studentSeed.phone,
      profileExtras: {
        admission_number: studentSeed.admission_number,
        class_id: klass.data.id,
        enrollment_date: studentSeed.enrollment_date,
        status: "ACTIVE",
      },
    }),
  });

  const parentRow = await adminSupabase
    .from("parents")
    .select("id")
    .eq("profile_id", parent.userId)
    .single();

  if (parentRow.error || !parentRow.data?.id) {
    throw new Error(parentRow.error?.message || "Failed to resolve demo parent row");
  }

  const [parentProfileRow, studentProfileRow] = await Promise.all([
    adminSupabase.from("profiles").select("id, school_id, role").eq("id", parent.userId).single(),
    adminSupabase.from("profiles").select("id, school_id, role").eq("id", student.userId).single(),
  ]);

  const linkAttempts = [
    {
      label: "parents.id + school_id",
      payload: {
        school_id: schoolProfile.school_id,
        parent_id: parentRow.data.id,
        student_id: student.userId,
        relationship: parentSeed.relation_type,
      },
    },
    {
      label: "profile.id + school_id",
      payload: {
        school_id: schoolProfile.school_id,
        parent_id: parent.userId,
        student_id: student.userId,
        relationship: parentSeed.relation_type,
      },
    },
    {
      label: "parents.id only",
      payload: {
        parent_id: parentRow.data.id,
        student_id: student.userId,
        relationship: parentSeed.relation_type,
      },
    },
    {
      label: "profile.id only",
      payload: {
        parent_id: parent.userId,
        student_id: student.userId,
        relationship: parentSeed.relation_type,
      },
    },
  ];

  let linkResult = null;
  const linkErrors = [];
  for (const attempt of linkAttempts) {
    const result = await adminSupabase.from("parent_students").insert(attempt.payload);
    if (!result.error) {
      linkResult = result;
      break;
    }
    linkErrors.push(`${attempt.label}: ${result.error.message}`);
  }

  let parentLinkStatus = {
    success: Boolean(linkResult),
    error: null,
  };

  if (!linkResult) {
    const legacyLink = await adminSupabase
      .from("profiles")
      .update({ parent_id: parent.userId })
      .eq("id", student.userId);

    if (legacyLink.error) {
      parentLinkStatus = {
        success: false,
        error: `${linkErrors.join(" || ")} | legacy fallback: ${legacyLink.error.message || "unknown"} | parentProfileSchool=${parentProfileRow.data?.school_id || "null"} studentProfileSchool=${studentProfileRow.data?.school_id || "null"} linkSchool=${schoolProfile.school_id}`,
      };
    } else {
      parentLinkStatus = {
        success: true,
        error: null,
      };
    }
  }

  const announcement = await apiFetch("/api/admin/announcements", token, {
    method: "POST",
    body: JSON.stringify({
      title: `Demo Announcement ${stamp.slice(-4)}`,
      content: "This announcement was created through the admin API flow after fixing the page wiring.",
      targetRole: null,
      targetClassId: klass.data.id,
      isPinned: true,
    }),
  });

  const event = await apiFetch("/api/admin/events", token, {
    method: "POST",
    body: JSON.stringify({
      title: `Demo Event ${stamp.slice(-4)}`,
      description: "Welcome session for demo users",
      eventDate: "2026-03-25",
      startTime: "09:00",
      endTime: "11:00",
      location: "Assembly Hall",
      targetRole: null,
      targetClassId: klass.data.id,
    }),
  });

  const teacherNotification = await safeInsertServiceRow("notifications", {
    school_id: schoolProfile.school_id,
    user_id: teacher.userId,
    title: "Demo Teacher Notification",
    message: "Your class and demo school are ready.",
    is_read: false,
  });

  const parentNotification = await safeInsertServiceRow("notifications", {
    school_id: schoolProfile.school_id,
    user_id: parent.userId,
    title: "Demo Parent Notification",
    message: "Your parent account is ready for mobile login.",
    is_read: false,
  });

  const studentNotification = await safeInsertServiceRow("notifications", {
    school_id: schoolProfile.school_id,
    user_id: student.userId,
    title: "Demo Student Notification",
    message: "Your class access is ready.",
    is_read: false,
  });

  const output = {
    baseUrl,
    school: {
      id: schoolProfile.school_id,
      name: schoolSeed.schoolName,
      code: schoolCode,
      classId: klass.data.id,
      className: klass.data.name,
    },
    admin: {
      email: adminEmail,
      password: adminPassword,
      userId: adminAuth.data.user.id,
    },
    teacher: {
      email: teacher.email,
      temporaryPassword: teacher.temporaryPassword,
      userId: teacher.userId,
    },
    parent: {
      email: parent.email,
      temporaryPassword: parent.temporaryPassword,
      userId: parent.userId,
    },
    student: {
      email: student.email,
      temporaryPassword: student.temporaryPassword,
      userId: student.userId,
    },
    artifacts: {
      announcementId: announcement.data.id,
      eventId: event.data.id,
      teacherNotificationId: teacherNotification.id,
      parentNotificationId: parentNotification.id,
      studentNotificationId: studentNotification.id,
    },
    parentLinkStatus,
  };

  console.log(JSON.stringify(output, null, 2));
}

async function apiFetch(route, token, init = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Request failed for ${route} (${response.status})`);
  }
  return body;
}

async function getProfile(id) {
  const result = await adminSupabase
    .from("profiles")
    .select("id,school_id,role,email")
    .eq("id", id)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function safeInsertServiceRow(table, payload) {
  let working = { ...payload };
  for (let index = 0; index < 10; index += 1) {
    const result = await adminSupabase.from(table).insert(working).select().single();
    if (!result.error) {
      return result.data;
    }

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw new Error(result.error.message || `Failed to insert ${table}`);
    }

    delete working[missingColumn];
  }

  throw new Error(`Failed to insert ${table}`);
}

function extractMissingColumn(message) {
  if (!message) return null;
  const match = message.match(/column ([^.]+\.)?([a-zA-Z0-9_]+) does not exist/i);
  if (match?.[2]) return match[2];
  const missing = message.match(/Could not find the '([^']+)' column/i);
  return missing?.[1] || null;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const values = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }

  return values;
}

function buildStamp() {
  const now = new Date();
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const timePart = [
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  return `${datePart}${timePart}`;
}

function buildPassword(prefix) {
  return `Zam@${prefix}${Math.random().toString(36).slice(-6)}9`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
