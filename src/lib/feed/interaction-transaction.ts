import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Protects feed writes against account blocks and post deletion. Shared row
 * locks allow independent interactions concurrently, but conflict with account
 * updates/blocks and post updates/deletions. Acquire accounts in ID order, then
 * the post; re-check block state after acquiring the account locks. Callbacks
 * must not update either locked account or the post itself (no lock upgrades).
 */
export async function withPostInteraction<T>(viewerId: string, postId: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    const original = await tx.execute<{ author_id: string }>(sql`SELECT author_id FROM posts WHERE id = ${postId}::uuid AND deleted_at IS NULL`);
    const authorId = original.rows[0]?.author_id;
    if (!authorId) throw new Error("Post unavailable.");
    const accounts = await tx.execute<{ id: string; status: string; deleted_at: string | null; onboarding_complete: boolean }>(sql`
      SELECT id, status, deleted_at, onboarding_complete FROM users WHERE id IN (${viewerId}::uuid, ${authorId}::uuid) ORDER BY id FOR SHARE
    `);
    const viewer = accounts.rows.find(row => row.id === viewerId);
    const author = accounts.rows.find(row => row.id === authorId);
    if (!viewer || !author || viewer.status !== "active" || viewer.deleted_at !== null || !viewer.onboarding_complete || author.status !== "active" || author.deleted_at !== null) throw new Error("Post unavailable.");
    const relationship = await tx.execute<{ blocked: boolean }>(sql`
      SELECT EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = ${viewerId}::uuid AND blocked_id = ${authorId}::uuid)
        OR (blocker_id = ${authorId}::uuid AND blocked_id = ${viewerId}::uuid)) AS blocked
    `);
    if (relationship.rows[0]?.blocked) throw new Error("Post unavailable.");
    const lockedPost = await tx.execute<{ id: string }>(sql`
      SELECT id FROM posts WHERE id = ${postId}::uuid AND author_id = ${authorId}::uuid AND deleted_at IS NULL FOR SHARE
    `);
    if (!lockedPost.rows.length) throw new Error("Post unavailable.");
    return work(tx);
  });
}
