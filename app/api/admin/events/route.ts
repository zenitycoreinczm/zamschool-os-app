import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireAdminContext } from "@/lib/server-auth";
import { EDGE_CACHE } from "@/lib/edge-cache";
import {
  normalizeAudienceForStorage,
  normalizeTargetRoleForResponse,
  normalizeTargetRoleForStorage,
} from "@/lib/audience-targeting";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventDate: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  targetRole: z.string().optional().nullable(),
  targetClassId: z.string().optional().nullable(),
});

const updateEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  eventDate: z.string().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  targetRole: z.string().optional().nullable(),
  targetClassId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const targetRole = normalizeTargetRoleForResponse(searchParams.get("targetRole"));
    const targetClassId = searchParams.get("targetClassId");
    const upcomingOnly = searchParams.get("upcomingOnly") === "true";

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalized = normalizeEventRows(data || []).filter((row) => {
      if (targetRole && row.target_role !== targetRole) return false;
      if (targetClassId && row.target_class_id !== targetClassId) return false;
      if (upcomingOnly && row.event_date && row.event_date < new Date().toISOString().slice(0, 10)) return false;
      return true;
    });

    normalized.sort((left, right) => String(left.event_date || "").localeCompare(String(right.event_date || "")));

    return NextResponse.json({ success: true, data: normalized }, {
      headers: { "Cache-Control": EDGE_CACHE.privateRead },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to fetch events") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-events:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, createEventSchema);
    const payload = buildEventPayload({ schoolId, userId, body });
    const data = await safeInsertWithMissingColumnRetry("events", payload);

    return NextResponse.json({ success: true, data: normalizeEventRow(data) });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to create event") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-events:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, updateEventSchema);
    const payload = buildEventPayload({ schoolId, userId: null, body, includeRequired: false });
    const data = await safeUpdateWithMissingColumnRetry("events", body.id, schoolId, payload);

    return NextResponse.json({ success: true, data: normalizeEventRow(data) });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to update event") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to delete event") }, { status: 500 });
  }
}

function buildEventPayload(input: {
  schoolId: string;
  userId: string | null;
  body: z.infer<typeof createEventSchema> | z.infer<typeof updateEventSchema>;
  includeRequired?: boolean;
}) {
  const includeRequired = input.includeRequired !== false;
  const eventDate = "eventDate" in input.body && input.body.eventDate ? input.body.eventDate : undefined;
  const startTime = "startTime" in input.body ? input.body.startTime || undefined : undefined;
  const endTime = "endTime" in input.body ? input.body.endTime || undefined : undefined;

  return compactRecord({
    ...(includeRequired ? { school_id: input.schoolId } : {}),
    title: "title" in input.body && input.body.title !== undefined ? input.body.title.trim() : undefined,
    description:
      "description" in input.body && input.body.description !== undefined
        ? input.body.description.trim() || null
        : undefined,
    event_date: eventDate,
    start_time: startTime,
    end_time: endTime,
    location:
      "location" in input.body && input.body.location !== undefined
        ? input.body.location.trim() || null
        : undefined,
    target_role:
      "targetRole" in input.body
        ? normalizeTargetRoleForStorage(input.body.targetRole)
        : undefined,
    target_class_id: "targetClassId" in input.body ? input.body.targetClassId || null : undefined,
    created_by: includeRequired ? input.userId : undefined,
    start_date: eventDate ? `${eventDate}T${startTime || "00:00"}` : undefined,
    end_date: eventDate ? `${eventDate}T${endTime || startTime || "23:59"}` : undefined,
    audience:
      "targetRole" in input.body
        ? normalizeAudienceForStorage(input.body.targetRole)
        : undefined,
    category: "school",
  });
}

function normalizeEventRows(rows: any[]) {
  return rows.map(normalizeEventRow);
}

function normalizeEventRow(row: any) {
  const eventDate = row?.event_date || sliceDate(row?.start_date);
  return {
    ...row,
    event_date: eventDate,
    start_time: row?.start_time || sliceTime(row?.start_date),
    end_time: row?.end_time || sliceTime(row?.end_date),
    target_role: normalizeTargetRoleForResponse(row?.target_role ?? row?.audience),
    target_class_id: row?.target_class_id ?? null,
  };
}

function extractMissingColumn(message?: string) {
  if (!message) return null;
  const match = message.match(/column ([^.]+\.)?([a-zA-Z0-9_]+) does not exist/i);
  if (match?.[2]) return match[2];
  const missing = message.match(/Could not find the '([^']+)' column/i);
  return missing?.[1] || null;
}

async function safeInsertWithMissingColumnRetry(table: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let index = 0; index < 12; index += 1) {
    const result = await supabaseAdmin.from(table).insert(working).select().single();
    if (!result.error) return result.data;

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) throw result.error;
    delete working[missingColumn];
  }

  throw new Error(`Failed to insert ${table}`);
}

async function safeUpdateWithMissingColumnRetry(table: string, id: string, schoolId: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let index = 0; index < 12; index += 1) {
    const result = await supabaseAdmin
      .from(table)
      .update(working)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (!result.error) return result.data;

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) throw result.error;
    delete working[missingColumn];
  }

  throw new Error(`Failed to update ${table}`);
}

function sliceDate(value: string | null | undefined) {
  return String(value || "").slice(0, 10) || null;
}

function sliceTime(value: string | null | undefined) {
  const text = String(value || "");
  return text.length >= 16 ? text.slice(11, 16) : null;
}

function compactRecord(record: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}
