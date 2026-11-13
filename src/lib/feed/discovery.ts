import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rankDiscovery, type DiscoveryCandidate } from "./discovery-ranking";

/** Limit the eligible pool before scoring; all visibility checks are repeated on delivery. */
export async function discoveryCandidates(viewerId: string): Promise<DiscoveryCandidate[]> {
  const result = await db.execute<DiscoveryCandidate>(sql`
    WITH candidates AS (
      SELECT p.id, p.author_id, p.created_at FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.deleted_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = u.id) OR (b.blocked_id = ${viewerId}::uuid AND b.blocker_id = u.id))
      ORDER BY p.created_at DESC, p.id DESC LIMIT 120
    )
    SELECT c.id, c.author_id AS "authorId", c.created_at AS "createdAt",
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${viewerId}::uuid AND f.following_id = c.author_id) AS following,
      (SELECT count(*)::int FROM post_replies r JOIN users ru ON ru.id = r.author_id
       WHERE r.post_id = c.id AND r.deleted_at IS NULL AND ru.status = 'active' AND ru.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = ru.id) OR (b.blocked_id = ${viewerId}::uuid AND b.blocker_id = ru.id))) AS "replyCount"
    FROM candidates c
  `);
  return rankDiscovery(result.rows.map(item => ({ ...item, createdAt: new Date(item.createdAt).toISOString() })));
}
