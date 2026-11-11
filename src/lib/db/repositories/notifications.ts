import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { redis, KEYS, invalidateCache } from "@/lib/redis/client";

export const notificationsRepository = {
  async getForUser(userId: string, { page = 1, limit = 30 } = {}) {
    const offset = (page - 1) * limit;
    const [rows, totalResult] = await Promise.all([
      db.query.notifications.findMany({
        where: eq(notifications.recipientId, userId),
        orderBy: [desc(notifications.createdAt)],
        limit,
        offset,
        with: {
          sender: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      db.select({ count: count() }).from(notifications).where(eq(notifications.recipientId, userId)),
    ]);
    return { notifications: rows, total: totalResult[0]?.count ?? 0 };
  },

  async getUnreadCount(userId: string): Promise<number> {
    const cached = redis ? await redis.get<number>(KEYS.unreadNotifCount(userId)) : null;
    if (cached != null) return cached;
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
    const n = result[0]?.count ?? 0;
    if (redis) {
      try {
        await redis.setex(KEYS.unreadNotifCount(userId), 30, n);
      } catch (error) {
        console.warn("[Notifications] Failed to set unread count:", error);
      }
    }
    return n;
  },

  async markAllRead(userId: string) {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
    await invalidateCache(KEYS.unreadNotifCount(userId));
  },

  async createNotification(data: {
    recipientId: string;
    senderId?: string | null;
    type: string;
    entityType: string;
    entityId: string;
    message: string;
  }) {
    const [notif] = await db.insert(notifications).values(data as any).returning();
    await invalidateCache(KEYS.unreadNotifCount(data.recipientId));
    return notif;
  },
};