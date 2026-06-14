import { NextResponse } from "next/server";
import { requireUnsafeLocalDevRoute } from "@/lib/dev-route-guard";

export async function GET(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) {
    return blocked;
  }

  const env: any = {};
  for (const key in process.env) {
    if (key.includes("SUPABASE") || key.includes("DATABASE") || key.includes("URL")) {
      env[key] = process.env[key]?.substring(0, 5) + "...";
    }
  }
  return NextResponse.json(env);
}
