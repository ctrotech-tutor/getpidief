import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
describe.skipIf(!enabled)("repost and block database foundations", () => {
  const author = randomUUID(), reader = randomUUID(), post = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    for (const id of [author, reader]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
    await db.execute(sql`INSERT INTO posts (id, author_id, kind, body) VALUES (${post}::uuid, ${author}::uuid, 'thought', 'Test')`);
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${author}::uuid, ${reader}::uuid)`); }
    finally { await db.$client.end(); }
  });
  it("deduplicates reposts per user and original and removes events when the original is deleted", async () => {
    await db.execute(sql`INSERT INTO post_reposts (post_id, user_id) VALUES (${post}::uuid, ${reader}::uuid)`);
    await expect(db.execute(sql`INSERT INTO post_reposts (post_id, user_id) VALUES (${post}::uuid, ${reader}::uuid)`)).rejects.toThrow();
    await db.execute(sql`DELETE FROM posts WHERE id = ${post}::uuid`);
    const result = await db.execute<{ count: number }>(sql`SELECT count(*)::int as count FROM post_reposts WHERE post_id = ${post}::uuid`);
    expect(result.rows[0].count).toBe(0);
  });
  it("prevents self-blocks and duplicate directional blocks, and cleans up after account removal", async () => {
    await expect(db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${author}::uuid, ${author}::uuid)`)).rejects.toThrow();
    await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${reader}::uuid, ${author}::uuid)`);
    await expect(db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${reader}::uuid, ${author}::uuid)`)).rejects.toThrow();
    await db.execute(sql`DELETE FROM auth_users WHERE id = ${author}::uuid`);
    const result = await db.execute<{ count: number }>(sql`SELECT count(*)::int as count FROM user_blocks WHERE blocked_id = ${author}::uuid`);
    expect(result.rows[0].count).toBe(0);
  });
});
