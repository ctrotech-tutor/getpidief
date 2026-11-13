import { NextRequest } from "next/server";
import { visibleNotificationTo } from "@/lib/notifications/visibility";
import { notificationsRepository } from "@/lib/db/repositories/notifications";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notifications, notificationTypeEnum } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { KEYS, invalidateCache } from "@/lib/redis/client";
import { apiSuccess, apiUnauthorized, apiError, handleApiError } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const countOnly = req.nextUrl.searchParams.get("count") === "true";
    const userId    = session.user.id;

    if (countOnly) {
      return apiSuccess({ unreadCount: await notificationsRepository.getUnreadCount(userId) });
    }

    const rawPage = req.nextUrl.searchParams.get("page") ?? "1";
    const rawLimit = req.nextUrl.searchParams.get("limit") ?? "30";
    const type = req.nextUrl.searchParams.get("type");
    // Bound work before issuing either the page query or the exact count.
    if (!/^[1-9]\d*$/.test(rawPage) || !/^[1-9]\d*$/.test(rawLimit)) return apiError("INVALID_PARAMS", "Invalid notification pagination.");
    const page = Number(rawPage), limit = Number(rawLimit);
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit) || limit > 100 || !Number.isSafeInteger(offset) || offset > 100_000) return apiError("INVALID_PARAMS", "Invalid notification pagination.");
    if (type && type !== "all" && !notificationTypeEnum.enumValues.includes(type as typeof notificationTypeEnum.enumValues[number])) return apiError("INVALID_PARAMS", "Invalid notification type.");

    const conditions = [eq(notifications.recipientId, userId), visibleNotificationTo(userId)];
    if (type && type !== "all") {
      conditions.push(eq(notifications.type, type as typeof notifications.$inferSelect["type"]));
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
        .select({ count: sql<number>`count(*)::int` })
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
        .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false), visibleNotificationTo(userId)));

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
            eq(notifications.recipientId, userId),
            visibleNotificationTo(userId)
          )
        );

      await invalidateCache(KEYS.unreadNotifCount(userId));

      return apiSuccess({ marked: true });
    }

    return apiSuccess({ marked: false });
  } catch (e) {
    return handleApiError(e);
  }
}