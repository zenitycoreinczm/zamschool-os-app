
import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { requireUnsafeLocalDevRoute } from "@/lib/dev-route-guard";

const execAsync = promisify(exec);

export async function GET(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) {
    return blocked;
  }

  try {
    // Run the script and capture output
    // We use npx tsx to run the script
    const { stdout, stderr } = await execAsync("npx tsx inspect_db.ts");
    
    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(stdout));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
