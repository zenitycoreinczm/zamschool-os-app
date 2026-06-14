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

const DEMO_PASSWORD = "11111111";
const DEMO_SCHOOL_CODE = env.DEMO_SCHOOL_CODE || "MPS1234A";
const today = new Date();
const todayIso = today.toISOString().slice(0, 10);
const lessonDayOfWeek = today.getUTCDay();

const schoolSeed = {
  code: DEMO_SCHOOL_CODE,
  name: "ZamSchool Demo Academy",
  address: "Demo Campus, Lusaka",
  phone: "+260970000100",
  email: "demo.admin@gmail.com",
  emis_code: "DEMO-MPS1234A",
  province: "Lusaka",
  district: "Lusaka",
  school_type: "Secondary",
  ownership_type: "Private",
};

const accountSeeds = {
  admin: {
    email: "demo.admin@gmail.com",
    role: "admin",
    first_name: "Demo",
    last_name: "Admin",
    phone: "+260970000100",
  },
  teachers: [
    {
      email: "demo.teacher1@gmail.com",
      role: "teacher",
      first_name: "Demo",
      last_name: "Teacher One",
      phone: "+260970000101",
      employee_number: "T-DEMO-001",
      department: "Languages",
      specialization: "English",
    },
    {
      email: "demo.teacher2@gmail.com",
      role: "teacher",
      first_name: "Demo",
      last_name: "Teacher Two",
      phone: "+260970000102",
      employee_number: "T-DEMO-002",
      department: "STEM",
      specialization: "Mathematics",
    },
    {
      email: "demo.teacher3@gmail.com",
      role: "teacher",
      first_name: "Demo",
      last_name: "Teacher Three",
      phone: "+260970000103",
      employee_number: "T-DEMO-003",
      department: "Sciences",
      specialization: "Science",
    },
  ],
  students: [
    {
      email: "demo.student1@gmail.com",
      role: "student",
      first_name: "Demo",
      last_name: "Student One",
      phone: "+260970000201",
      student_number: "S-DEMO-001",
    },
    {
      email: "demo.student2@gmail.com",
      role: "student",
      first_name: "Demo",
      last_name: "Student Two",
      phone: "+260970000202",
      student_number: "S-DEMO-002",
    },
    {
      email: "demo.student3@gmail.com",
      role: "student",
      first_name: "Demo",
      last_name: "Student Three",
      phone: "+260970000203",
      student_number: "S-DEMO-003",
    },
  ],
  parents: [
    {
      email: "demo.parent1@gmail.com",
      role: "parent",
      first_name: "Demo",
      last_name: "Parent One",
      phone: "+260970000301",
      relation_type: "Guardian",
      occupation: "Trader",
    },
    {
      email: "demo.parent2@gmail.com",
      role: "parent",
      first_name: "Demo",
      last_name: "Parent Two",
      phone: "+260970000302",
      relation_type: "Guardian",
      occupation: "Farmer",
    },
    {
      email: "demo.parent3@gmail.com",
      role: "parent",
      first_name: "Demo",
      last_name: "Parent Three",
      phone: "+260970000303",
      relation_type: "Guardian",
      occupation: "Nurse",
    },
  ],
};

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

  const classRow = await ensureClass({
    schoolId: school.id,
    name: "Grade 7A Demo",
    gradeLevel: 7,
    supervisorId: admin.id,
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

  await updateClassSupervisor(classRow.id, teacherAccounts[0].id);

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
    await upsertStudent({
      id: user.id,
      profile_id: user.id,
      school_id: school.id,
      class_id: classRow.id,
      student_number: seed.student_number,
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

  for (let index = 0; index < studentAccounts.length; index += 1) {
    await upsertParentStudentLink({
      school_id: school.id,
      parent_id: parentAccounts[index].id,
      student_id: studentAccounts[index].id,
      relationship: parentAccounts[index].relation_type,
    });
  }

  const subjects = await ensureSubjects(school.id, [
    { name: "English", code: "ENG" },
    { name: "Mathematics", code: "MTH" },
    { name: "Science", code: "SCI" },
  ]);

  const lessons = await ensureLessons({
    schoolId: school.id,
    classId: classRow.id,
    teacherAccounts,
    subjects,
  });

  const assignments = await ensureAssignments({
    schoolId: school.id,
    classId: classRow.id,
    teacherAccounts,
    subjects,
  });

  await ensureAnnouncements(school.id, admin.id, classRow.id);
  await ensureEvents(school.id, admin.id, classRow.id);
  await ensureMessages(school.id, {
    adminId: admin.id,
    teacherAccounts,
    studentAccounts,
    parentAccounts,
  });
  await ensureResults(school.id, studentAccounts, assignments);
  await ensureAttendance(school.id, classRow.id, teacherAccounts[0].id, studentAccounts, lessons[0]);

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
          password: DEMO_PASSWORD,
          admin: accountSeeds.admin.email,
          teachers: accountSeeds.teachers.map((row) => row.email),
          students: accountSeeds.students.map((row) => row.email),
          parents: accountSeeds.parents.map((row) => row.email),
        },
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
      password: DEMO_PASSWORD,
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
    password: DEMO_PASSWORD,
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
        supervisor_id: input.supervisorId,
      })
      .eq("id", existing.data.id);
    return { ...existing.data, grade_level: input.gradeLevel, supervisor_id: input.supervisorId };
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      school_id: input.schoolId,
      name: input.name,
      grade_level: input.gradeLevel,
      capacity: 40,
      supervisor_id: input.supervisorId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateClassSupervisor(classId, supervisorId) {
  const { error } = await supabase
    .from("classes")
    .update({ supervisor_id: supervisorId })
    .eq("id", classId);
  if (error) throw error;
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
      title: "English Reading Circle",
      subjectCode: "ENG",
      teacherId: input.teacherAccounts[0].id,
      start_time: "08:00:00",
      end_time: "08:40:00",
      room: "Room 1",
    },
    {
      title: "Mathematics Practice",
      subjectCode: "MTH",
      teacherId: input.teacherAccounts[1].id,
      start_time: "09:00:00",
      end_time: "09:40:00",
      room: "Room 2",
    },
    {
      title: "Science Lab Prep",
      subjectCode: "SCI",
      teacherId: input.teacherAccounts[2].id,
      start_time: "10:00:00",
      end_time: "10:40:00",
      room: "Lab 1",
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
      lessons.push({ ...existing.data, subject_id: subject.id, teacher_id: seed.teacherId });
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
      title: "English Comprehension Test",
      subjectCode: "ENG",
      teacherId: input.teacherAccounts[0].id,
      due_date: addDays(todayIso, 5),
      total_marks: 100,
    },
    {
      title: "Mathematics Weekly Quiz",
      subjectCode: "MTH",
      teacherId: input.teacherAccounts[1].id,
      due_date: addDays(todayIso, 6),
      total_marks: 100,
    },
    {
      title: "Science Observation Sheet",
      subjectCode: "SCI",
      teacherId: input.teacherAccounts[2].id,
      due_date: addDays(todayIso, 7),
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
          description: `${seed.title} for demo verification`,
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
        description: `${seed.title} for demo verification`,
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
      title: "Demo School Welcome",
      content: "Demo accounts are ready for roll call, messaging, and results testing.",
      target_role: null,
      target_class_id: classId,
      created_by: adminId,
      is_pinned: true,
    },
    { school_id: schoolId, title: "Demo School Welcome" }
  );
}

async function ensureEvents(schoolId, adminId, classId) {
  const eventDate = addDays(todayIso, 2);
  await maybeInsert(
    "events",
    {
      school_id: schoolId,
      title: "Demo Orientation",
      description: "Demo users can verify attendance and parent updates.",
      event_date: eventDate,
      start_time: "09:00:00",
      end_time: "10:00:00",
      start_date: `${eventDate}T09:00:00`,
      end_date: `${eventDate}T10:00:00`,
      location: "Assembly Hall",
      target_role: null,
      target_class_id: classId,
      audience: "all",
      created_by: adminId,
    },
    { school_id: schoolId, title: "Demo Orientation" }
  );
}

async function ensureMessages(schoolId, input) {
  const messageSeeds = [
    {
      sender_id: input.adminId,
      recipient_id: input.teacherAccounts[0].id,
      subject: "Demo Setup",
      body: "Please verify roll call for Grade 7A Demo.",
    },
    {
      sender_id: input.teacherAccounts[0].id,
      recipient_id: input.parentAccounts[0].id,
      subject: "Attendance Check",
      body: "Your learner will receive attendance updates after roll call.",
    },
    {
      sender_id: input.adminId,
      recipient_id: input.studentAccounts[0].id,
      subject: "Results Published",
      body: "Your first demo result is available for review.",
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

async function ensureResults(schoolId, studentAccounts, assignments) {
  const scores = [82, 76, 91];
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
          grade: score >= 85 ? "A" : score >= 75 ? "B" : "C",
          remarks: "Seeded demo result",
          published_at: new Date().toISOString(),
          published_by: assignment.teacher_id || null,
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

async function ensureAttendance(schoolId, classId, recordedBy, students, lesson) {
  const statuses = ["present", "late", "absent"];
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    await maybeInsert(
      "attendance",
      {
        school_id: schoolId,
        class_id: classId,
        student_id: student.id,
        date: todayIso,
        attendance_date: todayIso,
        session_name: lesson.title,
        session_time: lesson.start_time,
        status: statuses[index] || "present",
        remarks: index === 1 ? "Arrived after assembly" : null,
        notes: index === 2 ? "Awaiting parent follow-up" : null,
        recorded_by: recordedBy,
      },
      {
        school_id: schoolId,
        student_id: student.id,
        class_id: classId,
        attendance_date: todayIso,
        session_name: lesson.title,
      }
    );
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
    const { error } = await supabase
      .from(table)
      .upsert(working, { onConflict });

    if (!error) {
      return;
    }

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw error;
    }

    delete working[missingColumn];
  }

  throw new Error(`Failed to upsert ${table}`);
}

function extractMissingColumn(message) {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  if (match?.[1]) return match[1];
  const postgresMatch = message.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i);
  return postgresMatch?.[1] || null;
}

async function safeInsert(table, payload) {
  let working = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(working).select("id").single();
    if (!error) {
      return data.id;
    }

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
    if (!error) {
      return;
    }

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw error;
    }

    delete working[missingColumn];
  }

  throw new Error(`Failed to update ${table}`);
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
