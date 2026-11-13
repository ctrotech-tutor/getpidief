import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
vi.mock("@/lib/redis/client", () => ({ KEYS: { recommended: (id: string) => id }, invalidateCache: vi.fn() }));

describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("interest replacement integrity", () => {
  const user = randomUUID(), tags = [randomUUID(), randomUUID(), randomUUID()];
  let db: typeof import("@/lib/db/client").db;
  let repo: typeof import("@/lib/db/repositories/users").usersRepository;
  beforeAll(async () => {
    const target = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test")) throw new Error("Requires a disposable local _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ usersRepository: repo } = await import("@/lib/db/repositories/users"));
    await db.execute(sql`INSERT INTO auth_users(id,email) VALUES (${user}::uuid,${user + "@example.test"})`);
    await db.execute(sql`INSERT INTO users(id,username,display_name,onboarding_complete) VALUES (${user}::uuid,${"u"+user.replaceAll("-","")},'Fixture',true)`);
  });
  afterAll(async () => {
    if (!db) return;
    try { await db.execute(sql`DELETE FROM auth_users WHERE id=${user}::uuid`); }
    finally { await db.$client.end(); }
  });
  it("deduplicates input and serializes with other profile-locked writers", async () => {
    await repo.updateInterests(user, [tags[0], tags[0], tags[1]]);
    const before = await db.execute<{ tag_id: string }>(sql`SELECT tag_id FROM user_interests WHERE user_id=${user}::uuid ORDER BY tag_id`);
    expect(before.rows.map(row => row.tag_id)).toEqual([tags[0], tags[1]].sort());

    let unlock!: () => void, locked!: () => void;
    const ready = new Promise<void>(resolve => { locked = resolve; });
    const gate = new Promise<void>(resolve => { unlock = resolve; });
    const holder = db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM users WHERE id=${user}::uuid FOR UPDATE`);
      locked(); await gate;
      await tx.execute(sql`DELETE FROM user_interests WHERE user_id=${user}::uuid`);
      await tx.execute(sql`INSERT INTO user_interests(user_id,tag_id) VALUES (${user}::uuid,${tags[2]}::uuid)`);
    });
    await ready;
    let completed = false;
    const update = repo.updateInterests(user, [tags[0], tags[1]]).then(() => { completed = true; });
    try {
      // Wait until PostgreSQL observes the blocked lock request, rather than
      // assuming a sleep is enough to start the competing transaction.
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const result = await db.execute<{ waiting: boolean }>(sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid <> pg_backend_pid() AND wait_event_type='Lock' AND query ILIKE '%for update%') AS waiting`);
        waiting = result.rows[0].waiting;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      expect(completed).toBe(false);
    } finally { unlock(); await Promise.all([holder, update]); }
    const after = await db.execute<{ tag_id: string }>(sql`SELECT tag_id FROM user_interests WHERE user_id=${user}::uuid ORDER BY tag_id`);
    expect(after.rows.map(row => row.tag_id)).toEqual([tags[0], tags[1]].sort());
  });
});
