import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("notification delivery checks on disposable PostgreSQL", () => {
  const recipient = randomUUID(), sender = randomUUID(), missing = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  let insert: typeof import("@/lib/notifications/delivery").insertVisibleNotification;
  let canDeliver: typeof import("@/lib/notifications/delivery").canDeliverNotification;
  const notice = { recipientId: recipient, senderId: sender, type: "follow" as const, title: "New follower", message: "A follow" };
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ insertVisibleNotification: insert, canDeliverNotification: canDeliver } = await import("@/lib/notifications/delivery"));
    for (const id of [recipient, sender]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${recipient}::uuid, ${sender}::uuid)`); }
    finally { await db.$client.end(); }
  });
  it("allows system and eligible notifications; rejects missing or inactive accounts and both block directions", async () => {
    expect(await insert(notice)).toEqual(expect.any(String));
    expect(await insert({ ...notice, senderId: null, type: "system_announcement" })).toEqual(expect.any(String));
    expect(await canDeliver(recipient, null)).toBe(true);
    expect(await insert({ ...notice, senderId: missing })).toBeNull();
    expect(await canDeliver(recipient, missing)).toBe(false);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${sender}::uuid`);
    expect(await insert(notice)).toBeNull();
    expect(await canDeliver(recipient, sender)).toBe(false);
    await db.execute(sql`UPDATE users SET status = 'active' WHERE id = ${sender}::uuid`);
    for (const [from, to] of [[recipient, sender], [sender, recipient]]) {
      await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${from}::uuid, ${to}::uuid)`);
      expect(await insert(notice)).toBeNull();
      expect(await canDeliver(recipient, sender)).toBe(false);
      expect(await canDeliver(recipient, null)).toBe(true);
      await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${from}::uuid AND blocked_id = ${to}::uuid`);
    }
    expect(await canDeliver(recipient, sender)).toBe(true);
  });
  it("rechecks the block after waiting for account locks", async () => {
    let request: Promise<string | null> | undefined;
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM users WHERE id IN (${recipient}::uuid, ${sender}::uuid) ORDER BY id FOR UPDATE`);
      request = insert(notice);
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%status, deleted_at FROM users%FOR UPDATE%'`);
        if (result.rows[0].n > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await tx.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${recipient}::uuid, ${sender}::uuid)`);
    });
    expect(await request).toBeNull();
    expect(await canDeliver(recipient, sender)).toBe(false);
  });
});
