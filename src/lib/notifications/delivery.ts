import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

type NotificationData = typeof notifications.$inferInsert;

/** Serialize insertion against blocks; do not hold account locks over network calls. */
export async function insertVisibleNotification(data: NotificationData): Promise<string | null> {
  return db.transaction(async tx => {
    const recipientId = data.recipientId;
    const senderId = data.senderId ?? null;
    const accounts = await tx.execute<{ id: string; status: string; deleted_at: string | null }>(sql`
      SELECT id, status, deleted_at FROM users
      WHERE id IN (${recipientId}::uuid, ${senderId ?? recipientId}::uuid) ORDER BY id FOR UPDATE
    `);
    const requiredIds = new Set([recipientId, ...(senderId ? [senderId] : [])]);
    if (accounts.rows.length !== requiredIds.size || accounts.rows.some(account => account.status !== "active" || account.deleted_at !== null)) return null;
    if (senderId) {
      const result = await tx.execute<{ blocked: boolean }>(sql`SELECT EXISTS (
        SELECT 1 FROM user_blocks WHERE
          (blocker_id = ${recipientId}::uuid AND blocked_id = ${senderId}::uuid) OR
          (blocked_id = ${recipientId}::uuid AND blocker_id = ${senderId}::uuid)
      ) AS blocked`);
      if (result.rows[0]?.blocked) return null;
    }
    const [notification] = await tx.insert(notifications).values(data).returning({ id: notifications.id });
    return notification.id;
  });
}

/** Best-effort preflight, not atomic with an external provider accepting a message. */
export async function canDeliverNotification(recipientId: string, senderId?: string | null): Promise<boolean> {
  const result = await db.execute<{ allowed: boolean }>(sql`
    SELECT EXISTS (SELECT 1 FROM users WHERE id = ${recipientId}::uuid AND status = 'active' AND deleted_at IS NULL)
      AND (${senderId ?? null}::uuid IS NULL OR (
        EXISTS (SELECT 1 FROM users WHERE id = ${senderId ?? null}::uuid AND status = 'active' AND deleted_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM user_blocks WHERE
          (blocker_id = ${recipientId}::uuid AND blocked_id = ${senderId ?? null}::uuid) OR
          (blocked_id = ${recipientId}::uuid AND blocker_id = ${senderId ?? null}::uuid))
      )) AS allowed
  `);
  return result.rows[0]?.allowed === true;
}
