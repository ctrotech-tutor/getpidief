import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
describe.skipIf(!enabled)("serialized post interactions", () => {
  const author = randomUUID(), viewer = randomUUID(), secondViewer = randomUUID(), post = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  let withPostInteraction: typeof import("@/lib/feed/interaction-transaction").withPostInteraction;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ withPostInteraction } = await import("@/lib/feed/interaction-transaction"));
    for (const id of [author, viewer, secondViewer]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
    await db.execute(sql`INSERT INTO posts (id, author_id, kind, body) VALUES (${post}::uuid, ${author}::uuid, 'thought', 'Test')`);
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${author}::uuid, ${viewer}::uuid, ${secondViewer}::uuid)`); }
    finally { await db.$client.end(); }
  });
  it("allows available interactions and rejects deleted posts and inactive accounts", async () => {
    const callback = vi.fn().mockResolvedValue("ok");
    await expect(withPostInteraction(viewer, post, callback)).resolves.toBe("ok");
    await db.execute(sql`UPDATE posts SET deleted_at = now() WHERE id = ${post}::uuid`);
    await expect(withPostInteraction(viewer, post, callback)).rejects.toThrow("Post unavailable");
    await db.execute(sql`UPDATE posts SET deleted_at = null WHERE id = ${post}::uuid`);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${author}::uuid`);
    await expect(withPostInteraction(viewer, post, callback)).rejects.toThrow("Post unavailable");
    await db.execute(sql`UPDATE users SET status = 'active' WHERE id = ${author}::uuid`);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("allows independent interactions on the same post to overlap", async () => {
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    let enter!: () => void; const both = new Promise<void>(resolve => { enter = resolve; });
    let entered = 0;
    const callback = async () => { if (++entered === 2) enter(); await gate; };
    const first = withPostInteraction(viewer, post, callback);
    const second = withPostInteraction(secondViewer, post, callback);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([both, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Interactions did not overlap")), 2000); })]);
    } finally { if (timer) clearTimeout(timer); release(); await Promise.all([first, second]); }
    expect(entered).toBe(2);
  });
  it.each(["block", "delete"] as const)("holds the %s boundary until an in-flight interaction commits", async operation => {
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
    const interaction = withPostInteraction(viewer, post, async () => { entered(); await gate; });
    await started;
    const change = operation === "block" ? db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM users WHERE id IN (${author}::uuid, ${viewer}::uuid) ORDER BY id FOR UPDATE`);
      await tx.execute(sql`INSERT INTO user_blocks(blocker_id, blocked_id) VALUES (${author}::uuid, ${viewer}::uuid)`);
    }) : db.execute(sql`UPDATE posts SET deleted_at = now() WHERE id = ${post}::uuid`).then(() => undefined);
    try {
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const rows = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND (query LIKE '%ORDER BY id FOR UPDATE%' OR query LIKE '%UPDATE posts SET deleted_at%')`);
        if (rows.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
    } finally { release(); await interaction; await change; }
    await expect(withPostInteraction(viewer, post, async () => "unexpected")).rejects.toThrow("Post unavailable");
    if (operation === "block") await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${author}::uuid AND blocked_id = ${viewer}::uuid`);
    else await db.execute(sql`UPDATE posts SET deleted_at = NULL WHERE id = ${post}::uuid`);
  });
  it("rechecks a post after waiting for a soft deletion", async () => {
    const callback = vi.fn(); let request: Promise<string> | undefined;
    await db.transaction(async tx => {
      await tx.execute(sql`UPDATE posts SET deleted_at = now() WHERE id = ${post}::uuid`);
      request = withPostInteraction(viewer, post, callback).then(() => "allowed", error => error.message);
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const rows = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%SELECT id FROM posts%FOR SHARE%'`);
        if (rows.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
    });
    await expect(request).resolves.toBe("Post unavailable."); expect(callback).not.toHaveBeenCalled();
    await db.execute(sql`UPDATE posts SET deleted_at = NULL WHERE id = ${post}::uuid`);
  });
  it("rechecks an account after waiting for suspension", async () => {
    const callback = vi.fn(); let request: Promise<string> | undefined;
    await db.transaction(async tx => {
      await tx.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${author}::uuid`);
      request = withPostInteraction(viewer, post, callback).then(() => "allowed", error => error.message);
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const rows = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%onboarding_complete%FOR SHARE%'`);
        if (rows.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
    });
    await expect(request).resolves.toBe("Post unavailable."); expect(callback).not.toHaveBeenCalled();
    await db.execute(sql`UPDATE users SET status = 'active' WHERE id = ${author}::uuid`);
  });
  it("rechecks block state after waiting for the account lock", async () => {
    const callback = vi.fn();
    let request: Promise<unknown> | undefined;
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM users WHERE id IN (${author}::uuid, ${viewer}::uuid) ORDER BY id FOR UPDATE`);
      request = withPostInteraction(viewer, post, callback).then(() => "allowed", error => error.message);
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%onboarding_complete%FOR SHARE%'`);
        if (result.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await tx.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${author}::uuid, ${viewer}::uuid)`);
    });
    await expect(request).resolves.toBe("Post unavailable.");
    expect(callback).not.toHaveBeenCalled();
  });
});
