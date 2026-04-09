import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documentViews, documentReactions, documents } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { apiSuccess, apiUnauthorized, handleApiError } from "@/lib/utils/api";
import { redis, KEYS, incrCounter } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

interface Params { params: Promise<{ id: string }> }

// POST /api/documents/[id]/view — track document view
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id }  = await params;
    const session = await auth();
    const ip      = req.headers.get("x-forwarded-for") ?? "unknown";
    const ipHash  = crypto.createHash("sha256").update(ip).digest("hex");
    const sessionId = req.cookies.get("__session")?.value ?? ipHash.slice(0, 16);

    // Buffer view count increment in Redis (flushed to DB every 5 min by Inngest)
    await incrCounter(KEYS.viewCountBuffer(id));
    await redis.sadd(KEYS.pendingCounterFlush(), id);

    // Insert raw view event (for analytics — high write table)
    await db.insert(documentViews).values({
      documentId: id,
      userId:     session?.user?.id ?? null,
      sessionId,
      ipHash,
      userAgent:  req.headers.get("user-agent") ?? null,
      referrer:   req.headers.get("referer") ?? null,
    });

    if (session?.user?.id) {
      // Update recently viewed in Redis
      await redis.zadd(
        KEYS.recentlyViewed(session.user.id),
        { score: Date.now(), member: id }
      );
      // Keep only last 50
      await redis.zremrangebyrank(KEYS.recentlyViewed(session.user.id), 0, -51);

      await inngest.send({
        name: "document/viewed",
        data: { documentId: id, userId: session.user.id, sessionId, ipHash },
      });
    }

    return apiSuccess({ tracked: true });
  } catch (e) {
    return handleApiError(e);
  }
}