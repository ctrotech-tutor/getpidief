import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export type DigestResource = {
  id: string;
  title: string;
  slug: string;
  resource_type: string;
  author_id: string;
  author_name: string;
  author_username: string;
  download_count: number;
}

/** Re-run inside the delivery step, never reuse a memoized content snapshot. */
export async function compileWeeklyDigest(userId: string) {
  const recipient = await db.execute<{ email: string; display_name: string; username: string }>(sql`
    SELECT au.email, u.display_name, u.username FROM users u
    JOIN auth_users au ON au.id = u.id
    WHERE u.id = ${userId}::uuid AND u.status = 'active' AND u.deleted_at IS NULL
      AND u.onboarding_complete = true AND u.notification_preferences->>'weekly_digest' = 'true'
      AND au.email IS NOT NULL
  `);
  if (!recipient.rows[0]) return null;
  const visible = sql`d.status = 'approved' AND d.visibility = 'public' AND d.deleted_at IS NULL
    AND d.published_at >= NOW() - INTERVAL '7 days'
    AND u.status = 'active' AND u.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE
      (b.blocker_id = ${userId}::uuid AND b.blocked_id = d.author_id) OR
      (b.blocked_id = ${userId}::uuid AND b.blocker_id = d.author_id))`;
  const fields = sql`d.id, d.title, d.slug, d.resource_type, d.author_id,
    u.display_name AS author_name, u.username AS author_username, d.download_count`;
  const [followed, trending] = await Promise.all([
    db.execute<DigestResource>(sql`
      SELECT ${fields} FROM documents d JOIN users u ON u.id = d.author_id
      WHERE ${visible} AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = d.author_id)
      ORDER BY d.download_count DESC, d.id DESC LIMIT 5
    `),
    db.execute<DigestResource>(sql`
      SELECT ${fields} FROM documents d JOIN users u ON u.id = d.author_id
      WHERE ${visible} AND EXISTS (
        SELECT 1 FROM document_tags dt JOIN user_interests ui ON ui.tag_id = dt.tag_id
        WHERE dt.document_id = d.id AND ui.user_id = ${userId}::uuid
      ) ORDER BY d.download_count DESC, d.id DESC LIMIT 5
    `),
  ]);
  return { recipient: recipient.rows[0], followed: followed.rows, trending: trending.rows };
}
