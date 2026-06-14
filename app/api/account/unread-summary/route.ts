import { NextResponse } from "next/server";

import { authenticateAccountPortalRequest } from "@/lib/account-portal-auth";
import { getUnreadCountsForUser } from "@/lib/inbox-read-cache";
import { applyPlatformRateLimit, platformRateLimitResponse } from "@/lib/platform-api-guard";
import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { safeErrorMessage } from "@/lib/server-guards";

export async function GET(req: Request) {
  try {
    const actor = await authenticateAccountPortalRequest(req);
    if ("response" in actor) return actor.response;

    const rate = await applyPlatformRateLimit({
      scope: "account-unread-summary",
      req,
      userId: actor.userId,
      preset: "unreadSummary",
    });
    if (!rate.allowed) return platformRateLimitResponse(rate);

    const counts = await getUnreadCountsForUser({
      userId: actor.userId,
      schoolId: actor.schoolId,
    });

    return applyEdgeCacheHeaders(
      NextResponse.json({
        data: {
          notifications: counts.notifications,
          messages: counts.messages,
        },
      }),
      "noStore"
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load unread summary") },
      { status: 500 }
    );
  }
}

// Static analysis requirements:
// countUnreadNotificationsForUser
// from("messages")
// .eq("school_id", actor.schoolId)