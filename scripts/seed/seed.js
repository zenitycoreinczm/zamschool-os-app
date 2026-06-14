const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log("--- Seeding Database ---");

  // 1. Create a demo school
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: "Lusaka Academy (Demo)",
      code: "DEMO123",
      address: "123 Independence Ave, Lusaka",
    })
    .select()
    .single();

  if (schoolError) {
    console.error("Error creating school:", schoolError.message);
    return;
  }
  console.log("School created:", school.name);

  // 2. Create Grades
  const gradesToCreate = [
    { school_id: school.id, level: 1, name: "Grade 1" },
    { school_id: school.id, level: 2, name: "Grade 2" },
    { school_id: school.id, level: 3, name: "Grade 3" },
  ];
  const { data: grades, error: gradesError } = await supabase
    .from("grades")
    .insert(gradesToCreate)
    .select();

  if (gradesError) console.error("Error creating grades:", gradesError.message);
  else console.log("Grades created:", grades.length);

  // 3. Create Subjects
  const subjectsToCreate = [
    { school_id: school.id, name: "Mathematics" },
    { school_id: school.id, name: "English" },
    { school_id: school.id, name: "Science" },
  ];
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .insert(subjectsToCreate)
    .select();

  if (subjectsError) console.error("Error creating subjects:", subjectsError.message);
  else console.log("Subjects created:", subjects.length);

  console.log("--- Seeding Complete ---");
}

seed();
