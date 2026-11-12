import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
vi.mock("@/lib/redis/client", () => ({ KEYS: { unreadNotifCount: (id: string) => id, followerCount: (id: string) => id, userFollowingList: (id: string) => id }, invalidateCache: vi.fn().mockResolvedValue(undefined) }));
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("notification visibility on disposable PostgreSQL", () => {
  const a = randomUUID(), b = randomUUID(), c = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  let repo: typeof import("@/lib/db/repositories/notifications").notificationsRepository;
  let blocks: typeof import("@/lib/db/repositories/blocks").blocksRepository;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ notificationsRepository: repo } = await import("@/lib/db/repositories/notifications"));
    ({ blocksRepository: blocks } = await import("@/lib/db/repositories/blocks"));
    for (const id of [a, b, c]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
    await db.execute(sql`INSERT INTO notifications (recipient_id, sender_id, type, title, message, created_at) VALUES
      (${a}::uuid, ${b}::uuid, 'follow', 'blocked', 'blocked', now() + interval '2 seconds'),
      (${a}::uuid, ${c}::uuid, 'follow', 'visible', 'visible', now() + interval '1 second'),
      (${a}::uuid, NULL, 'system_announcement', 'system', 'system', now())`);
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${a}::uuid, ${b}::uuid, ${c}::uuid)`); }
    finally { await db.$client.end(); }
  });
  it("filters in either direction before pagination and counts, preserving system notices and unread state", async () => {
    expect(await repo.getUnreadCount(a)).toBe(3);
    await blocks.block(b, a);
    const first = await repo.getForUser(a, { page: 1, limit: 1 });
    expect(first.total).toBe(2);
    expect(first.notifications[0].senderId).toBe(c);
    expect((await repo.getForUser(a, { page: 2, limit: 1 })).notifications[0].senderId).toBeNull();
    expect(await repo.getUnreadCount(a)).toBe(2);
    await repo.markAllRead(a);
    expect(await repo.getUnreadCount(a)).toBe(0);
    await blocks.unblock(b, a);
    expect(await repo.getUnreadCount(a)).toBe(1);
    await blocks.block(a, b);
    expect(await repo.getUnreadCount(a)).toBe(0);
    await blocks.unblock(a, b);
    expect(await repo.getUnreadCount(a)).toBe(1);
  });
});
