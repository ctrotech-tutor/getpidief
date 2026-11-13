import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type FeedView = "latest" | "following" | "saved";
export type FeedEventKey = { id: string; kind: "post" | "repost" };
export async function readFeed(userId: string, view: FeedView, before?: string, beforeKind?: string, beforeAt?: string, refreshKeys?: FeedEventKey[]) {
  // Saved is a collection of originals; Following includes posts and reposts by followed people.
  if (refreshKeys?.length === 0) return { items: [], hasMore: false };
  type FeedEvent = { eventId: string; actorId: string; eventKind: "post" | "repost"; id: string; authorId: string; body: string; kind: string; createdAt: string; eventAt: string; name: string; username: string; avatarUrl: string | null; likeCount: number; liked: boolean; saved: boolean; following: boolean; replyCount: number; reposted: boolean; repostCount: number; reposterName: string | null; reposterUsername: string | null };
  const cursorKind = beforeKind === "repost" ? "repost" : "post";
  // Taking at most one page from each independently ordered event stream is
  // exact only after all visibility, view and cursor filters have been applied.
  const cursorTime = sql`COALESCE(${beforeAt ?? null}::timestamptz, (SELECT event_at FROM cursor_event))`;
  // Push the bounded refresh IDs into each event branch so PostgreSQL can use
  // primary-key lookups before the union and visibility checks. IN retains the
  // existing set semantics for repeated keys.
  const postKeys = refreshKeys?.filter(key => key.kind === "post").map(key => key.id) ?? [];
  const repostKeys = refreshKeys?.filter(key => key.kind === "repost").map(key => key.id) ?? [];
  const eventPool = refreshKeys ? sql`
    SELECT p.id AS event_id, 'post'::text AS event_kind, p.created_at AS event_at, p.id AS post_id, p.author_id AS actor_id FROM posts p
    WHERE p.deleted_at IS NULL AND ${postKeys.length ? sql`p.id IN (${sql.join(postKeys.map(id => sql`${id}::uuid`), sql`, `)})` : sql`false`}
    UNION ALL
    SELECT r.id, 'repost'::text, r.created_at, r.post_id, r.user_id FROM post_reposts r
    WHERE ${view !== "saved"} AND ${repostKeys.length ? sql`r.id IN (${sql.join(repostKeys.map(id => sql`${id}::uuid`), sql`, `)})` : sql`false`}
  ` : sql`
    (SELECT p.id AS event_id, 'post'::text AS event_kind, p.created_at AS event_at, p.id AS post_id, p.author_id AS actor_id
      FROM posts p JOIN users author ON author.id = p.author_id
      WHERE p.deleted_at IS NULL AND author.status = 'active' AND author.deleted_at IS NULL
        AND (${view !== "following"} OR EXISTS (SELECT 1 FROM follows WHERE follower_id = ${userId}::uuid))
        AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id = author.id) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id = author.id))
        AND (${view !== "following"} OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = p.author_id))
        AND (${view !== "saved"} OR EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${userId}::uuid))
        AND (${before === undefined} OR (p.created_at, 'post'::text, p.id) < (${cursorTime}, ${cursorKind}, ${before ?? null}::uuid))
      ORDER BY p.created_at DESC, p.id DESC LIMIT 21)
    UNION ALL
    (SELECT r.id, 'repost'::text, r.created_at, r.post_id, r.user_id
      FROM post_reposts r JOIN posts p ON p.id = r.post_id
      JOIN users author ON author.id = p.author_id JOIN users actor ON actor.id = r.user_id
      WHERE ${view !== "saved"} AND p.deleted_at IS NULL
        AND (${view !== "following"} OR EXISTS (SELECT 1 FROM follows WHERE follower_id = ${userId}::uuid))
        AND author.status = 'active' AND author.deleted_at IS NULL AND actor.status = 'active' AND actor.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id IN (author.id, actor.id)) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id IN (author.id, actor.id)))
        AND (${view !== "following"} OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = r.user_id))
        AND (${before === undefined} OR (r.created_at, 'repost'::text, r.id) < (${cursorTime}, ${cursorKind}, ${before ?? null}::uuid))
      ORDER BY r.created_at DESC, r.id DESC LIMIT 21)
  `;
  // Resolve legacy ID-only cursors directly. Referencing feed_events twice
  // materializes the entire union on PostgreSQL and makes bounded reads scan it.
  const events = await db.execute<FeedEvent>(sql`
    WITH cursor_event AS (
      SELECT created_at AS event_at FROM posts
      WHERE ${cursorKind === "post"} AND id = ${before ?? null}::uuid AND deleted_at IS NULL
      UNION ALL
      SELECT created_at FROM post_reposts
      WHERE ${cursorKind === "repost" && view !== "saved"} AND id = ${before ?? null}::uuid
    ), feed_events AS (${eventPool})
    SELECT e.event_id AS "eventId", e.actor_id AS "actorId", e.event_kind AS "eventKind", p.id, p.author_id AS "authorId", p.body, p.kind,
      p.created_at AS "createdAt", to_char(e.event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "eventAt", u.display_name AS name, u.username, u.avatar_url AS "avatarUrl",
      (SELECT count(*)::int FROM post_likes l WHERE l.post_id = p.id) AS "likeCount",
      EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ${userId}::uuid) AS liked,
      EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${userId}::uuid) AS saved,
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = p.author_id) AS following,
      (SELECT count(*)::int FROM post_replies r JOIN users ru ON ru.id = r.author_id WHERE r.post_id = p.id AND r.deleted_at IS NULL AND ru.status = 'active' AND ru.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id = ru.id) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id = ru.id))) AS "replyCount",
      EXISTS (SELECT 1 FROM post_reposts r WHERE r.post_id = p.id AND r.user_id = ${userId}::uuid) AS reposted,
      (SELECT count(*)::int FROM post_reposts r JOIN users x ON x.id = r.user_id WHERE r.post_id = p.id AND x.status = 'active' AND x.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id = x.id) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id = x.id))) AS "repostCount",
      CASE WHEN e.event_kind = 'repost' THEN actor.display_name END AS "reposterName",
      CASE WHEN e.event_kind = 'repost' THEN actor.username END AS "reposterUsername"
    FROM feed_events e JOIN posts p ON p.id = e.post_id
    JOIN users u ON u.id = p.author_id JOIN users actor ON actor.id = e.actor_id
    WHERE p.deleted_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL AND actor.status = 'active' AND actor.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id IN (u.id, actor.id)) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id IN (u.id, actor.id)))
      AND (${view !== "saved"} OR EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${userId}::uuid))
      AND (${view !== "following"} OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = e.actor_id))
      AND (${before === undefined} OR (e.event_at, e.event_kind, e.event_id) < (COALESCE(${beforeAt ?? null}::timestamptz, (SELECT event_at FROM cursor_event)), ${cursorKind}, ${before ?? null}::uuid))
    ORDER BY e.event_at DESC, e.event_kind DESC, e.event_id DESC LIMIT ${refreshKeys ? refreshKeys.length : 21}
  `);
  const rows = events.rows.map(event => ({ ...event, createdAt: new Date(event.createdAt) }));
  const visible = refreshKeys ? rows : rows.slice(0, 20); const ids = [...new Set(visible.map(x => x.id))];
  const replies = ids.length ? await db.execute<{ id: string; post_id: string; body: string; name: string; username: string }>(sql`
    select r.id, p.id as post_id, r.body, r.name, r.username from posts p
    cross join lateral (
      select r.id, r.body, u.display_name as name, u.username, r.created_at
      from post_replies r join users u on u.id = r.author_id
      where r.post_id = p.id and r.deleted_at is null and u.status = 'active' and u.deleted_at is null
        and not exists (select 1 from user_blocks b where (b.blocker_id = ${userId}::uuid and b.blocked_id = u.id) or (b.blocked_id = ${userId}::uuid and b.blocker_id = u.id))
      order by r.created_at desc, r.id desc limit 2
    ) r where p.id in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})
    order by p.id, r.created_at, r.id
  `) : { rows: [] };
  return { items: visible.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), replies: replies.rows.filter(reply => reply.post_id === item.id) })), hasMore: !refreshKeys && rows.length > 20 };
}
export type FeedItem = Awaited<ReturnType<typeof readFeed>>["items"][number];
