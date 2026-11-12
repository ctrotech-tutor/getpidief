import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("Pulse visibility on disposable PostgreSQL", () => {
  const viewer = randomUUID(), hidden = randomUUID(), visible = randomUUID(), doc = randomUUID(), privateDoc = randomUUID(), comment = randomUUID(), followLog = randomUUID(), commentLog = randomUUID();
  const ids = [viewer, hidden, visible];
  let db: typeof import("@/lib/db/client").db;
  let read: typeof import("@/lib/pulse/read").readPulse;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client")); ({ readPulse: read } = await import("@/lib/pulse/read"));
    for (const id of ids) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
    await db.execute(sql`INSERT INTO documents (id, slug, title, author_id, file_url, status, visibility, published_at) VALUES
      (${doc}::uuid, ${doc}, 'Public', ${hidden}::uuid, 'test.pdf', 'approved', 'public', now()),
      (${privateDoc}::uuid, ${privateDoc}, 'Private', ${visible}::uuid, 'test.pdf', 'approved', 'private', now())`);
    await db.execute(sql`INSERT INTO comments (id, document_id, user_id, content) VALUES (${comment}::uuid, ${doc}::uuid, ${visible}::uuid, 'Comment')`);
    await db.execute(sql`INSERT INTO follows (follower_id, following_id) VALUES (${visible}::uuid, ${hidden}::uuid)`);
    await db.execute(sql`INSERT INTO user_activity_log (id, user_id, action, entity_type, entity_id) VALUES
      (${followLog}::uuid, ${visible}::uuid, 'follow_created', 'user', ${hidden}::uuid),
      (${commentLog}::uuid, ${visible}::uuid, 'comment_posted', 'comment', ${comment}::uuid)`);
  });
  afterAll(async () => {
    if (!db) return;
    try { for (const id of ids) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`); }
    finally { await db.$client.end(); }
  });
  it("filters blocked authors and indirect activity before limits in either direction", async () => {
    expect((await read(null, 20)).map(i => i.id)).toEqual(expect.arrayContaining([`pub-${doc}`, `act-${followLog}`, `act-${commentLog}`]));
    for (const [from, to] of [[viewer, hidden], [hidden, viewer]]) {
      await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${from}::uuid, ${to}::uuid)`);
      expect(await read(viewer, 20)).toEqual([]);
      expect((await read(null, 20)).length).toBe(3);
      await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${from}::uuid AND blocked_id = ${to}::uuid`);
    }
  });
  it("respects current public content, active follows and activity privacy", async () => {
    expect((await read(viewer, 20)).map(i => i.id)).not.toContain(`pub-${privateDoc}`);
    await db.execute(sql`UPDATE users SET privacy_settings = '{"show_activity_in_pulse":false}'::jsonb WHERE id = ${visible}::uuid`);
    expect((await read(viewer, 20)).map(i => i.id)).toEqual([`pub-${doc}`]);
    await db.execute(sql`UPDATE users SET privacy_settings = '{}'::jsonb WHERE id = ${visible}::uuid`);
    await db.execute(sql`DELETE FROM follows WHERE follower_id = ${visible}::uuid AND following_id = ${hidden}::uuid`);
    await db.execute(sql`UPDATE comments SET is_deleted = true WHERE id = ${comment}::uuid`);
    expect((await read(viewer, 20)).map(i => i.id)).toEqual([`pub-${doc}`]);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${hidden}::uuid`);
    expect(await read(viewer, 20)).toEqual([]);
  });
});
