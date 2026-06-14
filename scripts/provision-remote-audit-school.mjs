import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {
  ...readEnvFile(path.join(projectRoot, ".env.local")),
  ...process.env,
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase service role configuration");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ACCOUNT_PASSWORD = "12345678";
const SCHOOL_CODE = "RMTSCH01";
const DOMAIN = "remote.com";
const today = new Date();
const todayIso = today.toISOString().slice(0, 10);
const lessonDayOfWeek = today.getUTCDay();

const schoolSeed = {
  code: SCHOOL_CODE,
  name: "Remote Audit Academy",
  address: "Great East Road, Lusaka",
  phone: "+260970100000",
  email: `admin1@${DOMAIN}`,
  emis_code: "RMT-AUDIT-001",
  province: "Lusaka",
  district: "Lusaka",
  school_type: "Secondary",
  ownership_type: "Private",
};

const accountSeeds = {
  admin: {
    email: `admin1@${DOMAIN}`,
    role: "admin",
    first_name: "Admin",
    last_name: "One",
    phone: "+260970100001",
  },
  teachers: Array.from({ length: 5 }, (_, index) => ({
    email: `teacher${index + 1}@${DOMAIN}`,
    role: "teacher",
    first_name: "Teacher",
    last_name: String(index + 1),
    phone: `+2609701001${String(index + 1).padStart(2, "0")}`,
    employee_number: `T-RMT-00${index + 1}`,
    department: index < 3 ? "Academics" : "STEM",
    specialization: ["Mathematics", "English", "Science", "Social Studies", "ICT"][index],
  })),
  students: Array.from({ length: 5 }, (_, index) => ({
    email: `student${index + 1}@${DOMAIN}`,
    role: "student",
    first_name: "Student",
    last_name: String(index + 1),
    phone: `+2609701002${String(index + 1).padStart(2, "0")}`,
    student_number: `S-RMT-00${index + 1}`,
  })),
  parents: Array.from({ length: 5 }, (_, index) => ({
    email: `parent${index + 1}@${DOMAIN}`,
    role: "parent",
    first_name: "Parent",
    last_name: String(index + 1),
    phone: `+2609701003${String(index + 1).padStart(2, "0")}`,
    relation_type: "Guardian",
    occupation: ["Trader", "Farmer", "Teacher", "Nurse", "Driver"][index],
  })),
};

const subjectSeeds = [
  { name: "Mathematics", code: "MTH" },
  { name: "English", code: "ENG" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SOS" },
  { name: "ICT", code: "ICT" },
];

const classSeeds = [
  {
    name: "Grade 7A",
    gradeLevel: 7,
    capacity: 40,
    studentIndexes: [0, 1, 2, 3, 4],
    supervisorTeacherIndex: 0,
  },
];

async function main() {
  const school = await upsertSchool();
  const admin = await ensureAccount(accountSeeds.admin);
  await upsertProfile({
    id: admin.id,
    school_id: school.id,
    role: "admin",
    first_name: accountSeeds.admin.first_name,
    last_name: accountSeeds.admin.last_name,
    email: accountSeeds.admin.email,
    phone: accountSeeds.admin.phone,
    must_change_password: false,
    temporary_password_issued_at: null,
  });

  const teacherAccounts = [];
  for (const seed of accountSeeds.teachers) {
    const user = await ensureAccount(seed);
    await upsertProfile({
      id: user.id,
      school_id: school.id,
      role: "teacher",
      first_name: seed.first_name,
      last_name: seed.last_name,
      email: seed.email,
      phone: seed.phone,
      employee_id: seed.employee_number,
      must_change_password: false,
      temporary_password_issued_at: null,
    });
    await upsertTeacher({
      id: user.id,
      profile_id: user.id,
      school_id: school.id,
      employee_number: seed.employee_number,
      department: seed.department,
      specialization: seed.specialization,
    });
    teacherAccounts.push({ ...seed, id: user.id });
  }

  const studentAccounts = [];
  for (const seed of accountSeeds.students) {
    const user = await ensureAccount(seed);
    await upsertProfile({
      id: user.id,
      school_id: school.id,
      role: "student",
      first_name: seed.first_name,
      last_name: seed.last_name,
      email: seed.email,
      phone: seed.phone,
      must_change_password: false,
      temporary_password_issued_at: null,
    });
    studentAccounts.push({ ...seed, id: user.id });
  }

  const parentAccounts = [];
  for (const seed of accountSeeds.parents) {
    const user = await ensureAccount(seed);
    await upsertProfile({
      id: user.id,
      school_id: school.id,
      role: "parent",
      first_name: seed.first_name,
      last_name: seed.last_name,
      email: seed.email,
      phone: seed.phone,
      must_change_password: false,
      temporary_password_issued_at: null,
    });
    await upsertParent({
      id: user.id,
      profile_id: user.id,
      school_id: school.id,
      relation_type: seed.relation_type,
      occupation: seed.occupation,
      phone: seed.phone,
    });
    parentAccounts.push({ ...seed, id: user.id });
  }

  const classes = [];
  for (const seed of classSeeds) {
    const classRow = await ensureClass({
      schoolId: school.id,
      name: seed.name,
      gradeLevel: seed.gradeLevel,
      capacity: seed.capacity,
      supervisorId: teacherAccounts[seed.supervisorTeacherIndex].id,
    });
    classes.push(classRow);

    for (const studentIndex of seed.studentIndexes) {
      const student = studentAccounts[studentIndex];
      await upsertStudent({
        id: student.id,
        profile_id: student.id,
        school_id: school.id,
        class_id: classRow.id,
        student_number: student.student_number,
      });
    }
  }

  for (let index = 0; index < studentAccounts.length; index += 1) {
    await upsertParentStudentLink({
      school_id: school.id,
      parent_id: parentAccounts[index].id,
      student_id: studentAccounts[index].id,
      relationship: parentAccounts[index].relation_type,
    });
  }

  const subjects = await ensureSubjects(school.id, subjectSeeds);
  const lessons = await ensureLessons({
    schoolId: school.id,
    classId: classes[0].id,
    teacherAccounts,
    subjects,
  });
  const assignments = await ensureAssignments({
    schoolId: school.id,
    classId: classes[0].id,
    teacherAccounts,
    subjects,
  });

  await ensureAnnouncements(school.id, admin.id, classes[0].id);
  await ensureEvents(school.id, admin.id, classes[0].id);
  await ensureMessages(school.id, {
    adminId: admin.id,
    teacherAccounts,
    studentAccounts,
    parentAccounts,
  });
  await ensureDraftResults(school.id, studentAccounts, assignments);

  const counts = await summarizeSchool(school.id);

  console.log(
    JSON.stringify(
      {
        school: {
          id: school.id,
          code: school.code,
          name: school.name,
        },
        credentials: {
          password: ACCOUNT_PASSWORD,
          admin: accountSeeds.admin.email,
          teachers: accountSeeds.teachers.map((row) => row.email),
          students: accountSeeds.students.map((row) => row.email),
          parents: accountSeeds.parents.map((row) => row.email),
        },
        class: {
          id: classes[0].id,
          name: classes[0].name,
          supervisor: teacherAccounts[0].email,
        },
        lessonIds: lessons.map((lesson) => ({ title: lesson.title, id: lesson.id })),
        assignmentIds: assignments.map((assignment) => ({ title: assignment.title, id: assignment.id })),
        counts,
      },
      null,
      2
    )
  );
}

async function ensureAccount(seed) {
  const existing = await findAuthUserByEmail(seed.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email: seed.email,
      password: ACCOUNT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: seed.role,
        first_name: seed.first_name,
        last_name: seed.last_name,
        must_change_password: false,
      },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: seed.email,
    password: ACCOUNT_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: seed.role,
      first_name: seed.first_name,
      last_name: seed.last_name,
      must_change_password: false,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || `Failed to create auth user for ${seed.email}`);
  }

  return data.user;
}

async function findAuthUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;

    const match = (data?.users || []).find(
      (user) => String(user.email || "").trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (!data?.users || data.users.length < 200) {
      return null;
    }
    page += 1;
  }
}

async function upsertSchool() {
  const payload = {
    ...schoolSeed,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("schools")
    .upsert(payload, { onConflict: "code" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsertProfile(payload) {
  await safeUpsert("profiles", payload, "id");
}

async function upsertTeacher(payload) {
  await safeUpsert("teachers", payload, "id");
}

async function upsertStudent(payload) {
  await safeUpsert("students", payload, "id");
}

async function upsertParent(payload) {
  await safeUpsert("parents", payload, "id");
}

async function upsertParentStudentLink(payload) {
  await safeUpsert("parent_students", payload, "parent_id,student_id");
}

async function ensureClass(input) {
  const existing = await supabase
    .from("classes")
    .select("id, school_id, name, grade_level, supervisor_id")
    .eq("school_id", input.schoolId)
    .eq("name", input.name)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw existing.error;
  }

  if (existing.data) {
    await supabase
      .from("classes")
      .update({
        grade_level: input.gradeLevel,
        capacity: input.capacity,
        supervisor_id: input.supervisorId,
      })
      .eq("id", existing.data.id);
    return {
      ...existing.data,
      grade_level: input.gradeLevel,
      supervisor_id: input.supervisorId,
      capacity: input.capacity,
    };
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      school_id: input.schoolId,
      name: input.name,
      grade_level: input.gradeLevel,
      capacity: input.capacity,
      supervisor_id: input.supervisorId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function ensureSubjects(schoolId, items) {
  const subjects = [];
  for (const item of items) {
    const existing = await supabase
      .from("subjects")
      .select("id, name, code")
      .eq("school_id", schoolId)
      .eq("code", item.code)
      .maybeSingle();

    if (existing.error && existing.error.code !== "PGRST116") {
      throw existing.error;
    }

    if (existing.data) {
      subjects.push(existing.data);
      continue;
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({
        school_id: schoolId,
        name: item.name,
        code: item.code,
      })
      .select()
      .single();

    if (error) throw error;
    subjects.push(data);
  }

  return subjects;
}

async function ensureLessons(input) {
  const lessonSeeds = [
    {
      title: "Morning Mathematics",
      subjectCode: "MTH",
      teacherId: input.teacherAccounts[0].id,
      start_time: "08:00:00",
      end_time: "08:40:00",
      room: "Room 1",
    },
    {
      title: "English Grammar",
      subjectCode: "ENG",
      teacherId: input.teacherAccounts[1].id,
      start_time: "09:00:00",
      end_time: "09:40:00",
      room: "Room 2",
    },
    {
      title: "Science Practice",
      subjectCode: "SCI",
      teacherId: input.teacherAccounts[2].id,
      start_time: "10:00:00",
      end_time: "10:40:00",
      room: "Lab 1",
    },
    {
      title: "Social Studies",
      subjectCode: "SOS",
      teacherId: input.teacherAccounts[3].id,
      start_time: "11:00:00",
      end_time: "11:40:00",
      room: "Room 3",
    },
    {
      title: "ICT Skills",
      subjectCode: "ICT",
      teacherId: input.teacherAccounts[4].id,
      start_time: "12:00:00",
      end_time: "12:40:00",
      room: "Lab 2",
    },
  ];

  const lessons = [];
  for (const seed of lessonSeeds) {
    const subject = input.subjects.find((item) => item.code === seed.subjectCode);
    const existing = await supabase
      .from("lessons")
      .select("id, title")
      .eq("school_id", input.schoolId)
      .eq("class_id", input.classId)
      .eq("title", seed.title)
      .maybeSingle();

    if (existing.error && existing.error.code !== "PGRST116") {
      throw existing.error;
    }

    if (existing.data) {
      await safeUpdateById("lessons", existing.data.id, {
        subject_id: subject.id,
        teacher_id: seed.teacherId,
        day_of_week: lessonDayOfWeek,
        start_time: seed.start_time,
        end_time: seed.end_time,
        room: seed.room,
      });
      lessons.push({ ...existing.data, subject_id: subject.id, teacher_id: seed.teacherId, start_time: seed.start_time, title: seed.title });
      continue;
    }

    const lessonId = await safeInsert("lessons", {
      school_id: input.schoolId,
      class_id: input.classId,
      subject_id: subject.id,
      teacher_id: seed.teacherId,
      title: seed.title,
      day_of_week: lessonDayOfWeek,
      start_time: seed.start_time,
      end_time: seed.end_time,
      room: seed.room,
    });
    lessons.push({ id: lessonId, title: seed.title, subject_id: subject.id, teacher_id: seed.teacherId, start_time: seed.start_time });
  }

  return lessons;
}

async function ensureAssignments(input) {
  const assignmentSeeds = [
    {
      title: "Mathematics Test 1",
      subjectCode: "MTH",
      teacherId: input.teacherAccounts[0].id,
      due_date: addDays(todayIso, 2),
      total_marks: 100,
    },
    {
      title: "English Essay",
      subjectCode: "ENG",
      teacherId: input.teacherAccounts[1].id,
      due_date: addDays(todayIso, 3),
      total_marks: 100,
    },
    {
      title: "Science Quiz",
      subjectCode: "SCI",
      teacherId: input.teacherAccounts[2].id,
      due_date: addDays(todayIso, 4),
      total_marks: 100,
    },
  ];

  const assignments = [];
  for (const seed of assignmentSeeds) {
    const subject = input.subjects.find((item) => item.code === seed.subjectCode);
    const existing = await supabase
      .from("assignments")
      .select("id, title")
      .eq("school_id", input.schoolId)
      .eq("class_id", input.classId)
      .eq("title", seed.title)
      .maybeSingle();

    if (existing.error && existing.error.code !== "PGRST116") {
      throw existing.error;
    }

    if (existing.data) {
      await supabase
        .from("assignments")
        .update({
          subject_id: subject.id,
          teacher_id: seed.teacherId,
          due_date: seed.due_date,
          total_marks: seed.total_marks,
          description: `${seed.title} for remote audit`,
        })
        .eq("id", existing.data.id);
      assignments.push({ ...existing.data, subject_id: subject.id, teacher_id: seed.teacherId });
      continue;
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert({
        school_id: input.schoolId,
        class_id: input.classId,
        subject_id: subject.id,
        teacher_id: seed.teacherId,
        title: seed.title,
        due_date: seed.due_date,
        total_marks: seed.total_marks,
        description: `${seed.title} for remote audit`,
      })
      .select()
      .single();

    if (error) throw error;
    assignments.push(data);
  }

  return assignments;
}

async function ensureAnnouncements(schoolId, adminId, classId) {
  await maybeInsert(
    "announcements",
    {
      school_id: schoolId,
      title: "Remote Audit Welcome",
      content: "Teacher, parent, and student accounts are ready for attendance and results verification.",
      target_role: null,
      target_class_id: classId,
      created_by: adminId,
      is_pinned: true,
    },
    { school_id: schoolId, title: "Remote Audit Welcome" }
  );
}

async function ensureEvents(schoolId, adminId, classId) {
  const eventDate = addDays(todayIso, 1);
  await maybeInsert(
    "events",
    {
      school_id: schoolId,
      title: "Parent Verification Day",
      description: "Audit event for testing attendance and results delivery.",
      event_date: eventDate,
      start_time: "14:00:00",
      end_time: "15:00:00",
      start_date: `${eventDate}T14:00:00`,
      end_date: `${eventDate}T15:00:00`,
      location: "Main Hall",
      target_role: null,
      target_class_id: classId,
      audience: "all",
      created_by: adminId,
    },
    { school_id: schoolId, title: "Parent Verification Day" }
  );
}

async function ensureMessages(schoolId, input) {
  const messageSeeds = [
    {
      sender_id: input.adminId,
      recipient_id: input.teacherAccounts[0].id,
      subject: "Class Teacher Assignment",
      body: "You are the class teacher for Grade 7A. Complete roll call and publish results.",
    },
    {
      sender_id: input.teacherAccounts[0].id,
      recipient_id: input.parentAccounts[0].id,
      subject: "Attendance Updates",
      body: "Attendance updates will reach you automatically after roll call.",
    },
    {
      sender_id: input.teacherAccounts[1].id,
      recipient_id: input.studentAccounts[0].id,
      subject: "Results Reminder",
      body: "Published results will appear on your account after teacher approval.",
    },
  ];

  for (const seed of messageSeeds) {
    await maybeInsert(
      "messages",
      {
        school_id: schoolId,
        ...seed,
      },
      {
        school_id: schoolId,
        sender_id: seed.sender_id,
        recipient_id: seed.recipient_id,
        subject: seed.subject,
      }
    );
  }
}

async function ensureDraftResults(schoolId, studentAccounts, assignments) {
  const scores = [88, 73, 65, 91, 54];
  for (let studentIndex = 0; studentIndex < studentAccounts.length; studentIndex += 1) {
    const student = studentAccounts[studentIndex];
    for (let assignmentIndex = 0; assignmentIndex < assignments.length; assignmentIndex += 1) {
      const assignment = assignments[assignmentIndex];
      const score = scores[(studentIndex + assignmentIndex) % scores.length];
      await maybeInsert(
        "results",
        {
          school_id: schoolId,
          student_id: student.id,
          assignment_id: assignment.id,
          exam_id: null,
          score,
          grade: score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D",
          remarks: "Prepared for teacher publish audit",
          published_at: null,
          published_by: null,
        },
        {
          school_id: schoolId,
          student_id: student.id,
          assignment_id: assignment.id,
        }
      );
    }
  }
}

async function summarizeSchool(schoolId) {
  const tables = [
    "profiles",
    "teachers",
    "students",
    "parents",
    "parent_students",
    "subjects",
    "lessons",
    "assignments",
    "results",
    "attendance",
    "messages",
    "announcements",
    "events",
    "notifications",
  ];

  const output = {};
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId);
    output[table] = error ? `ERR: ${error.message}` : count || 0;
  }
  return output;
}

async function maybeInsert(table, payload, match) {
  const existing = await supabase.from(table).select("id").match(match).maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") {
    throw existing.error;
  }

  if (existing.data?.id) {
    await safeUpdateById(table, existing.data.id, payload);
    return existing.data.id;
  }

  return safeInsert(table, payload);
}

async function safeUpsert(table, payload, onConflict) {
  let working = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { error } = await supabase.from(table).upsert(working, { onConflict });
    if (!error) return;

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw error;
    }
    delete working[missingColumn];
  }

  throw new Error(`Failed to upsert ${table}`);
}

async function safeInsert(table, payload) {
  let working = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(working).select("id").single();
    if (!error) return data.id;

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw error;
    }
    delete working[missingColumn];
  }

  throw new Error(`Failed to insert ${table}`);
}

async function safeUpdateById(table, id, payload) {
  let working = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { error } = await supabase.from(table).update(working).eq("id", id);
    if (!error) return;

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw error;
    }
    delete working[missingColumn];
  }

  throw new Error(`Failed to update ${table}`);
}

function extractMissingColumn(message) {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  if (match?.[1]) return match[1];
  const postgresMatch = message.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i);
  return postgresMatch?.[1] || null;
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
