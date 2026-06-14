const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function test() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this script.");
  }

  // Test 1: Auth endpoint reachable
  console.log("Test 1: Auth endpoint connectivity...");
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "wrong" }),
    });
    console.log(`  Status: ${r.status} ${r.statusText}`);
    const text = await r.text();
    console.log(`  Response: ${text.substring(0, 200)}`);
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
  }

  // Test 2: REST API (profiles) reachable  
  console.log("\nTest 2: REST API connectivity...");
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,role,email&limit=3`, {
      headers: { apikey: ANON_KEY },
    });
    console.log(`  Status: ${r.status} ${r.statusText}`);
    if (r.ok) {
      const data = await r.json();
      console.log(`  Profiles: ${data.length} found`);
    }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
  }

  // Test 3: Check CORS headers
  console.log("\nTest 3: CORS preflight check...");
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST" },
    });
    console.log(`  Status: ${r.status}`);
    console.log(`  ACAO: ${r.headers.get("access-control-allow-origin")}`);
    console.log(`  ACAM: ${r.headers.get("access-control-allow-methods")}`);
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
  }

  // Test 4: Start the dev server and test via Server-side
  console.log("\nTest 4: Auth settings from Management API...");
  try {
    if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
      console.log("  SKIPPED: set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN to query Management API settings.");
      return;
    }

    const r = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth/settings`, {
      headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` },
    });
    if (r.ok) {
      const data = await r.json();
      console.log(`  Site URL: ${data.site_url}`);
      console.log(`  URI allow list: ${(data.uri_allow_list || []).join(", ")}`);
    } else {
      console.log(`  Status: ${r.status} ${await r.text()}`);
    }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
  }
}

test().catch(console.error);
