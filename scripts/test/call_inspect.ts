
async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/debug/inspect_v2");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Fetch error:", e.message);
  }
}
run();
