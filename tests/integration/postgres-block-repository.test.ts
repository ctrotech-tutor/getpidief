import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
vi.mock("@/lib/redis/client", () => ({ KEYS: { followerCount: (id: string) => id, userFollowingList: (id: string) => id }, invalidateCache: vi.fn().mockResolvedValue(undefined) }));
describe.skipIf(!enabled)("block and follow serialization on disposable PostgreSQL", () => {
  const a = randomUUID(), b = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  let blocks: typeof import("@/lib/db/repositories/blocks").blocksRepository;
  let users: typeof import("@/lib/db/repositories/users").usersRepository;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ blocksRepository: blocks } = await import("@/lib/db/repositories/blocks"));
    ({ usersRepository: users } = await import("@/lib/db/repositories/users"));
    for (const id of [a, b]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${a}::uuid, ${b}::uuid)`); }
    finally { await db.$client.end(); }
  });
  it("removes mutual follows atomically with correct counters and disallows future follows in either direction", async () => {
    await users.follow(a, b); await users.follow(b, a);
    expect(await blocks.block(a, b)).toEqual({ changed: true });
    expect(await blocks.block(a, b)).toEqual({ changed: false });
    expect(await blocks.between(a, b)).toBe(true);
    const rows = await db.execute<{ follower_count: number; following_count: number }>(sql`SELECT follower_count, following_count FROM users WHERE id IN (${a}::uuid, ${b}::uuid)`);
    expect(rows.rows.every(row => row.follower_count === 0 && row.following_count === 0)).toBe(true);
    await expect(users.follow(a, b)).rejects.toThrow("NOT_FOUND");
    await expect(users.follow(b, a)).rejects.toThrow("NOT_FOUND");
    expect(await blocks.unblock(b, a)).toEqual({ changed: false });
    expect(await blocks.unblock(a, b)).toEqual({ changed: true });
    expect(await blocks.between(a, b)).toBe(false);
    await users.follow(a, b);
  });
  it("serializes concurrent block/follow operations and never leaves a follow on a blocked pair", async () => {
    for (let i = 0; i < 12; i++) {
      await blocks.unblock(a, b);
      await Promise.allSettled([users.follow(a, b), users.follow(b, a), blocks.block(a, b)]);
      expect(await blocks.between(a, b)).toBe(true);
      const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM follows WHERE (follower_id = ${a}::uuid AND following_id = ${b}::uuid) OR (follower_id = ${b}::uuid AND following_id = ${a}::uuid)`);
      expect(result.rows[0].n).toBe(0);
      const rows = await db.execute<{ follower_count: number; following_count: number }>(sql`SELECT follower_count, following_count FROM users WHERE id IN (${a}::uuid, ${b}::uuid)`);
      expect(rows.rows.every(row => row.follower_count === 0 && row.following_count === 0)).toBe(true);
    }
  });
  it("rejects self-block and inactive targets", async () => {
    await expect(blocks.block(a, a)).rejects.toThrow("INVALID_BLOCK");
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${b}::uuid`);
    await expect(blocks.block(a, b)).rejects.toThrow("NOT_FOUND");
  });
});
