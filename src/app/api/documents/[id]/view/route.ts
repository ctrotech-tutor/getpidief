import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { apiError, apiSuccess, handleApiError } from "@/lib/utils/api";
import { redis, KEYS, incrCounter } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return apiError("INVALID_PARAMS", "Invalid document ID");
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
    // Never store an authentication cookie or raw referrer in analytics.
    const sessionId = ipHash.slice(0, 16);
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const result = await db.execute<{ id: string }>(sql`
      WITH eligible AS MATERIALIZED (
        SELECT id FROM documents WHERE id = ${id}::uuid AND status = 'approved'
          AND visibility = 'public' AND deleted_at IS NULL FOR UPDATE
      )
      INSERT INTO document_views (document_id, user_id, session_id, ip_hash, user_agent)
      SELECT id, ${userId}::uuid, ${sessionId}, ${ipHash}, ${userAgent} FROM eligible RETURNING id
    `);
    if (!result.rows.length) return apiError("NOT_FOUND", "Document not found", 404);

    // The view has committed. Analytics delivery must not turn it into a failure.
    try {
      await incrCounter(KEYS.viewCountBuffer(id));
      if (redis) await redis.sadd(KEYS.pendingCounterFlush(), id);
    } catch (error) { console.warn("View counter buffering failed", error); }
    if (userId) {
      if (redis) {
        try {
          await redis.zadd(KEYS.recentlyViewed(userId), { score: Date.now(), member: id });
          await redis.zremrangebyrank(KEYS.recentlyViewed(userId), 0, -51);
        } catch (error) { console.warn("Recently viewed update failed", error); }
      }
      try { await inngest.send({ name: "document/viewed", data: { documentId: id, userId, sessionId, ipHash } }); }
      catch (error) { console.warn("View event delivery failed", error); }
    }
    const response = apiSuccess({ tracked: true });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) { return handleApiError(error); }
}
