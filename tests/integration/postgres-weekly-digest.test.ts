import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("weekly digest visibility on disposable PostgreSQL", () => {
  const viewer = randomUUID(), hidden = randomUUID(), visible = randomUUID(), tag = randomUUID();
  const ids = [viewer, hidden, visible];
  let db: typeof import("@/lib/db/client").db;
  let compile: typeof import("@/lib/notifications/weekly-digest").compileWeeklyDigest;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ compileWeeklyDigest: compile } = await import("@/lib/notifications/weekly-digest"));
    for (const id of ids) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete, notification_preferences) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true, '{"weekly_digest":true}'::jsonb)`);
    }
    await db.execute(sql`INSERT INTO tags (id, name, slug) VALUES (${tag}::uuid, ${tag}, ${tag})`);
    await db.execute(sql`INSERT INTO user_interests (user_id, tag_id) VALUES (${viewer}::uuid, ${tag}::uuid)`);
    await db.execute(sql`INSERT INTO follows (follower_id, following_id) VALUES (${viewer}::uuid, ${hidden}::uuid), (${viewer}::uuid, ${visible}::uuid)`);
    for (let i = 0; i < 9; i++) {
      const id = randomUUID(); const author = i < 6 ? hidden : visible;
      const visibility = i === 7 ? "private" : "public";
      await db.execute(sql`INSERT INTO documents (id, slug, title, author_id, file_url, status, visibility, published_at, download_count, deleted_at)
        VALUES (${id}::uuid, ${id}, ${'resource-' + i}, ${author}::uuid, 'test.pdf', 'approved', ${visibility}::visibility, now(), ${100-i}, ${i === 8 ? new Date() : null})`);
      await db.execute(sql`INSERT INTO document_tags (document_id, tag_id) VALUES (${id}::uuid, ${tag}::uuid)`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try {
      for (const id of ids) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`);
      await db.execute(sql`DELETE FROM tags WHERE id = ${tag}::uuid`);
    } finally { await db.$client.end(); }
  });
  it("filters both block directions before limits and includes only current public, active resources", async () => {
    for (const [from, to] of [[viewer, hidden], [hidden, viewer]]) {
      // A stale follow may coexist with a block in imported or queued data.
      await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${from}::uuid, ${to}::uuid)`);
      const digest = await compile(viewer);
      expect(digest?.followed.map(d => d.title)).toEqual(["resource-6"]);
      expect(digest?.trending.map(d => d.title)).toEqual(["resource-6"]);
      expect(digest?.followed[0].author_username).toBe("test" + visible.replaceAll("-", ""));
      await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${from}::uuid AND blocked_id = ${to}::uuid`);
    }
    expect((await compile(viewer))?.trending).toHaveLength(5);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${hidden}::uuid`);
    expect((await compile(viewer))?.trending.map(d => d.title)).toEqual(["resource-6"]);
  });
  it("honours the current opt-in, account state and email instead of queued data", async () => {
    expect((await compile(viewer))?.recipient.email).toBe(viewer + "@example.test");
    await db.execute(sql`UPDATE auth_users SET email = 'changed@example.test' WHERE id = ${viewer}::uuid`);
    expect((await compile(viewer))?.recipient.email).toBe("changed@example.test");
    await db.execute(sql`UPDATE users SET notification_preferences = '{"weekly_digest":false}'::jsonb WHERE id = ${viewer}::uuid`);
    expect(await compile(viewer)).toBeNull();
    await db.execute(sql`UPDATE users SET notification_preferences = '{"weekly_digest":true}'::jsonb, status = 'suspended' WHERE id = ${viewer}::uuid`);
    expect(await compile(viewer)).toBeNull();
  });
});
