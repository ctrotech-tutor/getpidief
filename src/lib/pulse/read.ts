import { db } from "@/lib/db/client";
import { sql, type SQL } from "drizzle-orm";

function visibleAccount(viewerId: string | null, id: SQL) {
  return viewerId ? sql`NOT EXISTS (SELECT 1 FROM user_blocks b WHERE
    (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = ${id}) OR
    (b.blocked_id = ${viewerId}::uuid AND b.blocker_id = ${id}))` : sql`true`;
}

/** Public Pulse remains accessible anonymously. Signed-in reads filter both sides of a block. */
export async function readPulse(viewerId: string | null, limit: number) {
  const documents = await db.execute<{
    id: string; slug: string; title: string; thumbnail_url: string | null; author_id: string;
    author_name: string; author_avatar_url: string | null; institution_id: string | null;
    institution_name: string | null; published_at: Date; category_id: string | null;
  }>(sql`
    SELECT d.id, d.slug, d.title, d.thumbnail_url, d.author_id, u.display_name AS author_name,
      u.avatar_url AS author_avatar_url, d.institution_id, i.name AS institution_name, d.published_at, d.category_id
    FROM documents d JOIN users u ON u.id = d.author_id LEFT JOIN institutions i ON i.id = d.institution_id
    WHERE d.status = 'approved' AND d.visibility = 'public' AND d.deleted_at IS NULL AND d.published_at IS NOT NULL
      AND u.status = 'active' AND u.deleted_at IS NULL AND ${visibleAccount(viewerId, sql`u.id`)}
    ORDER BY d.published_at DESC, d.id DESC LIMIT ${limit}
  `);
  const activity = await db.execute<{
    id: string; action: string; created_at: Date; actor_id: string; actor_name: string;
  }>(sql`
    SELECT a.id, a.action, a.created_at, u.id AS actor_id, u.display_name AS actor_name
    FROM user_activity_log a JOIN users u ON u.id = a.user_id
    WHERE a.created_at >= now() - interval '24 hours'
      AND u.status = 'active' AND u.deleted_at IS NULL AND u.privacy_settings->>'show_activity_in_pulse' IS DISTINCT FROM 'false'
      AND ${visibleAccount(viewerId, sql`u.id`)}
      AND (
        (a.action = 'follow_created' AND a.entity_type = 'user' AND EXISTS (
          SELECT 1 FROM users target JOIN follows f ON f.following_id = target.id AND f.follower_id = a.user_id
          WHERE target.id = a.entity_id AND target.status = 'active' AND target.deleted_at IS NULL
            AND ${visibleAccount(viewerId, sql`target.id`)}
        )) OR
        (a.action = 'comment_posted' AND a.entity_type = 'comment' AND EXISTS (
          SELECT 1 FROM comments c JOIN documents d ON d.id = c.document_id JOIN users author ON author.id = d.author_id
          WHERE c.id = a.entity_id AND c.user_id = a.user_id AND NOT c.is_deleted AND c.deleted_at IS NULL
            AND d.status = 'approved' AND d.visibility = 'public' AND d.deleted_at IS NULL
            AND author.status = 'active' AND author.deleted_at IS NULL AND ${visibleAccount(viewerId, sql`author.id`)}
        )) OR
        (a.action = 'document_uploaded' AND a.entity_type = 'document' AND EXISTS (
          SELECT 1 FROM documents d WHERE d.id = a.entity_id AND d.author_id = a.user_id
            AND d.status = 'approved' AND d.visibility = 'public' AND d.deleted_at IS NULL
        ))
      )
    ORDER BY a.created_at DESC, a.id DESC LIMIT ${limit}
  `);
  const published = documents.rows.map(doc => ({
    id: `pub-${doc.id}`, type: "published" as const, timestamp: doc.published_at,
    documentId: doc.id, slug: doc.slug, title: doc.title, thumbnailUrl: doc.thumbnail_url,
    authorId: doc.author_id, authorName: doc.author_name, authorAvatarUrl: doc.author_avatar_url,
    institutionId: doc.institution_id, institutionName: doc.institution_name,
    categoryId: doc.category_id, publishedAt: doc.published_at,
  }));
  const actions = activity.rows.map(row => ({
    id: `act-${row.id}`, type: "activity" as const, timestamp: row.created_at,
    activity: {
      type: row.action === "follow_created" ? "follow" : row.action === "comment_posted" ? "milestone" : "upload",
      actorId: row.actor_id, actorName: row.actor_name, actorAvatarUrl: null, institutionId: null,
      description: row.action === "follow_created" ? "New follow activity" : row.action === "comment_posted" ? "New discussion activity" : "New upload activity",
      entityId: row.id, createdAt: row.created_at,
    },
  }));
  return [...published, ...actions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
