import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { feedReports } from "@/lib/db/schema";

/** Lock all involved accounts in ID order, then post and reply, then report. */
export async function createFeedReport(reporterId: string, postId: string, replyId: string | null, reason: string): Promise<void> {
  await db.transaction(async tx => {
    const original = await tx.execute<{ author_id: string }>(sql`SELECT author_id FROM posts WHERE id = ${postId}::uuid AND deleted_at IS NULL`);
    const postAuthor = original.rows[0]?.author_id;
    if (!postAuthor) throw new Error("Post unavailable.");
    let replyAuthor: string | null = null;
    if (replyId) {
      const reply = await tx.execute<{ author_id: string }>(sql`SELECT author_id FROM post_replies WHERE id = ${replyId}::uuid AND post_id = ${postId}::uuid AND deleted_at IS NULL`);
      replyAuthor = reply.rows[0]?.author_id ?? null;
      if (!replyAuthor) throw new Error("Reply unavailable.");
    }
    const accounts = await tx.execute<{ id: string; status: string; deleted_at: string | null; onboarding_complete: boolean }>(sql`
      SELECT id, status, deleted_at, onboarding_complete FROM users
      WHERE id IN (${reporterId}::uuid, ${postAuthor}::uuid, ${replyAuthor}::uuid) ORDER BY id FOR UPDATE
    `);
    const reporter = accounts.rows.find(x => x.id === reporterId);
    const author = accounts.rows.find(x => x.id === postAuthor);
    const replyUser = replyAuthor ? accounts.rows.find(x => x.id === replyAuthor) : null;
    if (!reporter || reporter.status !== "active" || reporter.deleted_at !== null || !reporter.onboarding_complete || !author || author.status !== "active" || author.deleted_at !== null) throw new Error("Post unavailable.");
    if (replyAuthor && (!replyUser || replyUser.status !== "active" || replyUser.deleted_at !== null)) throw new Error("Reply unavailable.");
    const blocked = await tx.execute<{ post_blocked: boolean; reply_blocked: boolean }>(sql`
      SELECT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${reporterId}::uuid AND b.blocked_id = ${postAuthor}::uuid) OR (b.blocked_id = ${reporterId}::uuid AND b.blocker_id = ${postAuthor}::uuid)) AS post_blocked,
      EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${reporterId}::uuid AND b.blocked_id = ${replyAuthor}::uuid) OR (b.blocked_id = ${reporterId}::uuid AND b.blocker_id = ${replyAuthor}::uuid)) AS reply_blocked
    `);
    if (blocked.rows[0]?.post_blocked) throw new Error("Post unavailable.");
    if (blocked.rows[0]?.reply_blocked) throw new Error("Reply unavailable.");
    const lockedPost = await tx.execute<{ id: string }>(sql`SELECT id FROM posts WHERE id = ${postId}::uuid AND author_id = ${postAuthor}::uuid AND deleted_at IS NULL FOR UPDATE`);
    if (!lockedPost.rows.length) throw new Error("Post unavailable.");
    if (replyId) {
      const lockedReply = await tx.execute<{ id: string }>(sql`SELECT id FROM post_replies WHERE id = ${replyId}::uuid AND post_id = ${postId}::uuid AND author_id = ${replyAuthor}::uuid AND deleted_at IS NULL FOR UPDATE`);
      if (!lockedReply.rows.length) throw new Error("Reply unavailable.");
    }
    if ((replyAuthor ?? postAuthor) === reporterId) throw new Error("You cannot report your own content.");
    await tx.insert(feedReports).values({ reporterId, postId, replyId, reason }).onConflictDoNothing();
  });
}
