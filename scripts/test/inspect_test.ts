
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log("Project URL Host:", new URL(supabaseUrl).hostname);

  // Try to query some basic info
  const { data: tables, error: tablesError } = await supabase
    .from("profiles")
    .select("count", { count: "exact", head: true });
  
  console.log("Profiles count:", tables ? tables : "Error or head only");
  if (tablesError) console.error("Profiles count error:", tablesError);

  // Try to query information_schema (likely to fail via PostgREST)
  const { data: infoTables, error: infoError } = await supabase
    .from("information_schema.tables")
    .select("*")
    .limit(1);
  
  if (infoError) {
    console.log("Cannot query information_schema directly via PostgREST (expected).");
  } else {
    console.log("Can query information_schema directly!");
  }
}

inspect();
