import { NextResponse } from "next/server";

import { authenticateAccountPortalRequest } from "@/lib/account-portal-auth";
import { loadNotificationsForUser } from "@/lib/inbox-queries";
import {
  loadProfilesByIdentityIds,
  summarizeParticipant,
} from "@/lib/message-participants";
import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const actor = await authenticateAccountPortalRequest(req);
    if ("response" in actor) return actor.response;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 8), 1), 20);

    const [messagesResult, notificationRows] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, body, subject, created_at, is_read")
        .eq("school_id", actor.schoolId)
        .eq("recipient_id", actor.userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(limit),
      loadNotificationsForUser({
        userId: actor.userId,
        schoolId: actor.schoolId,
        limit,
      }),
    ]);

    if (messagesResult.error) {
      throw messagesResult.error;
    }

    const messageRows = messagesResult.data || [];
    const senderIds = Array.from(
      new Set(messageRows.map((row: { sender_id?: string | null }) => row.sender_id).filter(Boolean))
    ) as string[];

    const profilesByIdentity = await loadProfilesByIdentityIds(senderIds, actor.schoolId);

    const messages = messageRows.map((row: any) => {
      const sender = summarizeParticipant(
        profilesByIdentity.get(String(row.sender_id || "")) || null
      );
      return {
        id: row.id,
        sender_id: row.sender_id,
        recipient_id: row.recipient_id,
        subject: row.subject,
        body: row.body,
        created_at: row.created_at,
        is_read: row.is_read,
        senderLabel: sender?.label || "Unknown sender",
        senderRole: sender?.role || null,
      };
    });

    const notifications = (notificationRows || [])
      .filter((row: { is_read?: boolean }) => !row.is_read)
      .slice(0, limit)
      .map((row: { id: string; title?: string; message?: string; body?: string; type?: string; created_at?: string }) => ({
        id: row.id,
        title: row.title || "Notification",
        message: row.message || row.body || "",
        type: row.type || null,
        created_at: row.created_at,
      }));

    return applyEdgeCacheHeaders(
      NextResponse.json({
        data: {
          messages,
          notifications,
        },
      }),
      "noStore"
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load inbox preview") },
      { status: 500 }
    );
  }
}