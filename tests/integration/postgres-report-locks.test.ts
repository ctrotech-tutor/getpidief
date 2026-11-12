import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
describe.skipIf(!enabled)("serialized feed reports", () => {
  const author = randomUUID(), viewer = randomUUID(), replyAuthor = randomUUID(), post = randomUUID(), reply = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  let createFeedReport: typeof import("@/lib/feed/report-transaction").createFeedReport;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ createFeedReport } = await import("@/lib/feed/report-transaction"));
    for (const id of [author, viewer, replyAuthor]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
    await db.execute(sql`INSERT INTO posts (id, author_id, kind, body) VALUES (${post}::uuid, ${author}::uuid, 'thought', 'Test')`);
    await db.execute(sql`INSERT INTO post_replies (id, post_id, author_id, body) VALUES (${reply}::uuid, ${post}::uuid, ${replyAuthor}::uuid, 'Test reply')`);
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${author}::uuid, ${viewer}::uuid, ${replyAuthor}::uuid)`); }
    finally { await db.$client.end(); }
  });
  it("accepts and deduplicates valid reports and rejects self-reports", async () => {
    await createFeedReport(viewer, post, reply, "spam"); await createFeedReport(viewer, post, reply, "spam");
    const rows = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM feed_reports WHERE post_id = ${post}::uuid`);
    expect(rows.rows[0].n).toBe(1);
    await expect(createFeedReport(author, post, null, "spam")).rejects.toThrow("own content");
    await db.execute(sql`DELETE FROM feed_reports WHERE post_id = ${post}::uuid`);
  });
  it.each(["post", "reply"] as const)("rechecks %s author blocks after acquiring locks", async kind => {
    const blockedAuthor = kind === "post" ? author : replyAuthor;
    let request: Promise<string> | undefined;
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM users WHERE id IN (${viewer}::uuid, ${blockedAuthor}::uuid) ORDER BY id FOR UPDATE`);
      request = createFeedReport(viewer, post, kind === "reply" ? reply : null, "spam").then(() => "allowed", error => error.message);
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%onboarding_complete%FOR UPDATE%'`);
        if (result.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await tx.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${blockedAuthor}::uuid, ${viewer}::uuid)`);
    });
    await expect(request).resolves.toBe(kind === "post" ? "Post unavailable." : "Reply unavailable.");
    const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM feed_reports WHERE post_id = ${post}::uuid`);
    expect(result.rows[0].n).toBe(0);
    await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${blockedAuthor}::uuid AND blocked_id = ${viewer}::uuid`);
  });
});
