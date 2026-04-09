import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { redis, KEYS, invalidateCache } from "@/lib/redis/client";
import { apiSuccess, apiUnauthorized, handleApiError } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const countOnly = req.nextUrl.searchParams.get("count") === "true";
    const userId    = session.user.id;

    if (countOnly) {
      // Fast path: check Redis first
      const cached = await redis.get<number>(KEYS.unreadNotifCount(userId));
      if (cached != null) return apiSuccess({ unreadCount: cached });

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));

      const count = result[0]?.count ?? 0;
      await redis.setex(KEYS.unreadNotifCount(userId), 30, count);
      return apiSuccess({ unreadCount: count });
    }

    const page  = parseInt(req.nextUrl.searchParams.get("page")  ?? "1",  10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10);
    const type  = req.nextUrl.searchParams.get("type");
    const offset= (page - 1) * limit;

    const conditions = [eq(notifications.recipientId, userId)];
    if (type && type !== "all") {
      conditions.push(eq(notifications.type, type as any));
    }

    const [rows, countResult] = await Promise.all([
      db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: [desc(notifications.createdAt)],
        limit,
        offset,
        with: {
          sender: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions)),
    ]);

    return apiSuccess({
      notifications: rows,
      total:         countResult[0]?.count ?? 0,
      page,
      totalPages:    Math.ceil((countResult[0]?.count ?? 0) / limit),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body = await req.json().catch(() => ({}));
    const userId = session.user.id;

    if (body.markAllRead) {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));

      await invalidateCache(KEYS.unreadNotifCount(userId));
      return apiSuccess({ marked: true });
    }

    if (body.notificationId) {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.id, body.notificationId),
            eq(notifications.recipientId, userId)
          )
        );

      // Decrement Redis counter
      const current = await redis.get<number>(KEYS.unreadNotifCount(userId));
      if (current != null && current > 0) {
        await redis.setex(KEYS.unreadNotifCount(userId), 30, current - 1);
      }

      return apiSuccess({ marked: true });
    }

    return apiSuccess({ marked: false });
  } catch (e) {
    return handleApiError(e);
  }
}