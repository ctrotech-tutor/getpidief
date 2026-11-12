import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
vi.mock("@/lib/redis/client", () => ({ KEYS: { followerCount: (id: string) => id, userFollowingList: (id: string) => id }, invalidateCache: vi.fn().mockResolvedValue(undefined) }));
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("block management on disposable PostgreSQL", () => {
  const actor = randomUUID(), first = randomUUID(), second = randomUUID(), third = randomUUID(), missing = randomUUID();
  const ids = [actor, first, second, third];
  let db: typeof import("@/lib/db/client").db;
  let blocks: typeof import("@/lib/db/repositories/blocks").blocksRepository;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ blocksRepository: blocks } = await import("@/lib/db/repositories/blocks"));
    for (const id of ids) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try { for (const id of ids) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`); }
    finally { await db.$client.end(); }
  });
  it("lists only outgoing blocks with stable pagination and unavailable accounts can be unblocked", async () => {
    await blocks.block(actor, first); await blocks.block(actor, second); await blocks.block(actor, third);
    await blocks.block(first, actor);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${second}::uuid`);
    const all = await blocks.listBlocked(actor, { limit: 10 });
    expect(all.accounts.map(u => u.id)).toEqual([first, second, third].sort());
    expect(all.accounts.find(u => u.id === second)).toMatchObject({ username: null, displayName: "Unavailable account", available: false });
    expect((await blocks.listBlocked(first)).accounts.map(u => u.id)).toEqual([actor]);
    const page = await blocks.listBlocked(actor, { limit: 1 });
    expect(page.nextCursor).toBe(page.accounts[0].id);
    await blocks.unblock(actor, page.accounts[0].id);
    const remaining = await blocks.listBlocked(actor, { limit: 2, afterId: page.nextCursor! });
    expect(remaining.accounts.map(u => u.id)).toEqual(all.accounts.slice(1).map(u => u.id));
    expect(remaining.nextCursor).toBeNull();
    await blocks.unblock(actor, second);
    expect(await blocks.unblock(actor, missing)).toEqual({ changed: false });
    expect(await blocks.between(first, actor)).toBe(true); // incoming block is not removed
    await expect(blocks.listBlocked(actor, { limit: 0 })).rejects.toThrow("INVALID_PARAMS");
    await expect(blocks.listBlocked(actor, { afterId: "" })).rejects.toThrow("INVALID_PARAMS");
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${actor}::uuid`);
    await expect(blocks.unblock(actor, third)).rejects.toThrow("NOT_FOUND");
    await db.execute(sql`UPDATE users SET status = 'active' WHERE id = ${actor}::uuid`);
  });
  it("unblock waits for an in-flight block and deletes the committed row", async () => {
    await blocks.unblock(actor, third);
    let request: Promise<{ changed: boolean }> | undefined;
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM users WHERE id IN (${actor}::uuid, ${third}::uuid) ORDER BY id FOR UPDATE`);
      await tx.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${actor}::uuid, ${third}::uuid)`);
      request = blocks.unblock(actor, third);
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%status, deleted_at FROM users%FOR UPDATE%'`);
        if (result.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
    });
    expect(await request).toEqual({ changed: true });
    expect(await blocks.between(actor, third)).toBe(false);
  });
});
