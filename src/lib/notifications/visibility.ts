import { notifications } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/** Exclude blocked senders in either direction; senderless system notices remain visible. */
export function visibleNotificationTo(userId: string) {
  return sql`not exists (select 1 from user_blocks b where
    (b.blocker_id = ${userId}::uuid and b.blocked_id = ${notifications.senderId}) or
    (b.blocked_id = ${userId}::uuid and b.blocker_id = ${notifications.senderId}))`;
}
