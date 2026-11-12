import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
vi.mock("@/lib/redis/client", () => ({ KEYS: { followerCount: (id: string) => id, userFollowingList: (id: string) => id }, invalidateCache: vi.fn().mockResolvedValue(undefined) }));
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("discovery visibility on disposable PostgreSQL", () => {
  const viewer = randomUUID(), owner = randomUUID(), blocked = randomUUID(), visible = randomUUID(), institution = randomUUID();
  const ids = [viewer, owner, blocked, visible];
  let db: typeof import("@/lib/db/client").db;
  let users: typeof import("@/lib/db/repositories/users").usersRepository;
  let blocks: typeof import("@/lib/db/repositories/blocks").blocksRepository;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ usersRepository: users } = await import("@/lib/db/repositories/users"));
    ({ blocksRepository: blocks } = await import("@/lib/db/repositories/blocks"));
    await db.execute(sql`INSERT INTO institutions (id, name, slug, country, country_code) VALUES (${institution}::uuid, 'Test', ${institution}, 'Nigeria', 'NG')`);
    for (const id of ids) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete, institution_id, document_count) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true, ${institution}::uuid, 1)`);
    }
    await users.follow(blocked, owner); await users.follow(visible, owner);
    await users.follow(owner, blocked); await users.follow(owner, visible);
  });
  afterAll(async () => {
    if (!db) return;
    try {
      for (const id of ids) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`);
      await db.execute(sql`DELETE FROM institutions WHERE id = ${institution}::uuid`);
    } finally { await db.$client.end(); }
  });
  it("filters both directions before list pagination and counts, including list owner", async () => {
    for (const [from, to] of [[viewer, blocked], [blocked, viewer]]) {
      await blocks.block(from, to);
      for (const result of [await users.getFollowers(owner, { viewerId: viewer, limit: 1 }), await users.getFollowing(owner, { viewerId: viewer, limit: 1 })]) {
        expect(result.total).toBe(1);
        const rows = 'followers' in result ? result.followers : result.following;
        expect(rows.map(row => row.id)).toEqual([visible]);
      }
      expect((await users.getFollowers(owner, { viewerId: null })).total).toBe(2);
      const suggestions = await users.getFollowSuggestions(viewer);
      expect(suggestions.rows.map(row => row.id)).not.toContain(blocked);
      expect(suggestions.rows.map(row => row.id)).toContain(visible);
      await blocks.unblock(from, to);
      expect((await users.getFollowing(owner, { viewerId: viewer })).total).toBe(2);
    }
    await blocks.block(owner, viewer);
    expect((await users.getFollowers(owner, { viewerId: viewer })).total).toBe(0);
    expect((await users.getFollowing(owner, { viewerId: viewer })).total).toBe(0);
    expect((await users.getFollowers(owner, { viewerId: null })).total).toBe(2);
  });
});
