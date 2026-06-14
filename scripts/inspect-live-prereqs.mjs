import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {
  ...readEnvFile(path.resolve(".env.local")),
  ...process.env,
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase service role env is missing from .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const checks = [
  ["profiles", () => supabase.from("profiles").select("id,school_id,role,must_change_password,temporary_password_issued_at").limit(1)],
  ["grades", () => supabase.from("grades").select("id,school_id,level,name").limit(1)],
  ["classes", () => supabase.from("classes").select("id,school_id,grade_id,supervisor_id,name,capacity").limit(1)],
  ["classes->grades relation", () => supabase.from("classes").select("id,grades(id,name,level)").limit(1)],
  ["students", () => supabase.from("students").select("id,profile_id,school_id,class_id,student_number,is_active").limit(1)],
  ["teachers", () => supabase.from("teachers").select("id,profile_id,school_id,employee_number,employee_id,is_active").limit(1)],
  ["parents", () => supabase.from("parents").select("id,profile_id,school_id,relation_type").limit(1)],
  ["parent_students", () => supabase.from("parent_students").select("id,parent_id,student_id,relationship").limit(1)],
  ["notifications", () => supabase.from("notifications").select("id,school_id,user_id,title,message,type,is_read").limit(1)],
  ["events", () => supabase.from("events").select("id,school_id,title,event_date,start_time,end_time,target_role,target_class_id").limit(1)],
  ["announcements", () => supabase.from("announcements").select("id,school_id,title,content,target_role,target_class_id,is_pinned,expires_at").limit(1)],
];

async function main() {
  const results = [];
  for (const [label, runner] of checks) {
    const { error, data } = await runner();
    results.push({
      label,
      ok: !error,
      error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null,
      rowCount: Array.isArray(data) ? data.length : 0,
    });
  }

  console.log(JSON.stringify(results, null, 2));

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    values[line.slice(0, eqIndex).trim()] = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
