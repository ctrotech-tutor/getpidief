import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invalidateCache, KEYS } from "@/lib/redis/client";

/** Internal groundwork only: do not expose until all block boundaries are enforced. */
export const blocksRepository = {
  async block(blockerId: string, blockedId: string): Promise<{ changed: boolean }> {
    if (blockerId === blockedId) throw new Error("INVALID_BLOCK");
    const result = await db.transaction(async tx => {
      const locked = await tx.execute<{ id: string; status: string; deleted_at: string | null }>(sql`
        SELECT id, status, deleted_at FROM users WHERE id IN (${blockerId}::uuid, ${blockedId}::uuid) ORDER BY id FOR UPDATE
      `);
      if (locked.rows.length !== 2 || locked.rows.some(u => u.status !== "active" || u.deleted_at !== null)) throw new Error("NOT_FOUND");
      const inserted = await tx.execute<{ blocker_id: string }>(sql`
        INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${blockerId}::uuid, ${blockedId}::uuid)
        ON CONFLICT (blocker_id, blocked_id) DO NOTHING RETURNING blocker_id
      `);
      // Remove both directions even on a retry; adjust counts only for rows removed.
      await tx.execute(sql`
        WITH removed AS (
          DELETE FROM follows WHERE (follower_id = ${blockerId}::uuid AND following_id = ${blockedId}::uuid)
            OR (follower_id = ${blockedId}::uuid AND following_id = ${blockerId}::uuid)
          RETURNING follower_id, following_id
        )
        UPDATE users SET
          following_count = GREATEST(0, following_count - (SELECT count(*)::int FROM removed WHERE follower_id = users.id)),
          follower_count = GREATEST(0, follower_count - (SELECT count(*)::int FROM removed WHERE following_id = users.id))
        WHERE id IN (${blockerId}::uuid, ${blockedId}::uuid)
      `);
      return { changed: inserted.rows.length > 0 };
    });
    await invalidateCache(KEYS.followerCount(blockerId), KEYS.followerCount(blockedId), KEYS.userFollowingList(blockerId), KEYS.userFollowingList(blockedId)).catch(() => {});
    return result;
  },
  async unblock(blockerId: string, blockedId: string): Promise<{ changed: boolean }> {
    if (blockerId === blockedId) throw new Error("INVALID_BLOCK");
    const result = await db.execute<{ blocker_id: string }>(sql`
      DELETE FROM user_blocks WHERE blocker_id = ${blockerId}::uuid AND blocked_id = ${blockedId}::uuid RETURNING blocker_id
    `);
    return { changed: result.rows.length > 0 };
  },
  async between(firstId: string, secondId: string): Promise<boolean> {
    const result = await db.execute<{ blocked: boolean }>(sql`
      SELECT EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = ${firstId}::uuid AND blocked_id = ${secondId}::uuid)
        OR (blocker_id = ${secondId}::uuid AND blocked_id = ${firstId}::uuid)) AS blocked
    `);
    return result.rows[0]?.blocked === true;
  },
};
