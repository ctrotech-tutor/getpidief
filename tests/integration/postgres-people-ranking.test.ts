import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
vi.mock("@/lib/redis/client", () => ({ KEYS: {}, invalidateCache: vi.fn() }));

describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("people ranking on disposable PostgreSQL", () => {
  const viewer = randomUUID(), people = Array.from({ length: 8 }, () => randomUUID());
  const institution = randomUUID(), tags = [randomUUID(), randomUUID()];
  let db: typeof import("@/lib/db/client").db;
  let repo: typeof import("@/lib/db/repositories/users").usersRepository;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client")); ({ usersRepository: repo } = await import("@/lib/db/repositories/users"));
    await db.execute(sql`INSERT INTO institutions (id,name,slug,country,country_code) VALUES (${institution}::uuid,'Fixture',${institution},'Test','TT')`);
    for (const [index, user] of [viewer, ...people].entries()) {
      await db.execute(sql`INSERT INTO auth_users (id,email) VALUES (${user}::uuid,${user + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id,username,display_name,onboarding_complete,follower_count,institution_id) VALUES (${user}::uuid,${"u"+user.replaceAll("-","")},'Fixture',true,${index},${index === 0 || index === 3 ? institution : null}::uuid)`);
    }
    for (const [index, tag] of tags.entries()) await db.execute(sql`INSERT INTO tags(id,name,slug) VALUES (${tag}::uuid,${"tag"+tag},${"tag"+index+tag})`);
    // The database currently permits duplicate interests; scoring must retain
    // the original join multiplicity until a separate data migration addresses it.
    for (const [user, tag] of [[viewer,tags[0]],[viewer,tags[0]],[viewer,tags[1]],[people[0],tags[0]],[people[0],tags[0]],[people[1],tags[0]],[people[1],tags[1]]] as const)
      await db.execute(sql`INSERT INTO user_interests(user_id,tag_id) VALUES (${user}::uuid,${tag}::uuid)`);
    await db.execute(sql`INSERT INTO follows(follower_id,following_id) VALUES (${viewer}::uuid,${people[3]}::uuid)`);
    await db.execute(sql`INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (${viewer}::uuid,${people[4]}::uuid),(${people[5]}::uuid,${viewer}::uuid)`);
    await db.execute(sql`UPDATE users SET status='suspended' WHERE id=${people[6]}::uuid`);
    await db.execute(sql`UPDATE users SET onboarding_complete=false WHERE id=${people[7]}::uuid`);
  });
  afterAll(async () => {
    if (!db) return;
    try {
      for (const user of [viewer, ...people]) await db.execute(sql`DELETE FROM auth_users WHERE id=${user}::uuid`);
      for (const tag of tags) await db.execute(sql`DELETE FROM tags WHERE id=${tag}::uuid`);
      await db.execute(sql`DELETE FROM institutions WHERE id=${institution}::uuid`);
    } finally { await db.$client.end(); }
  });
  async function originalOrder() {
    const result = await db.execute<{ id: string }>(sql`
      SELECT u.id FROM users u
      WHERE u.status='active' AND u.deleted_at IS NULL AND u.id != ${viewer}::uuid AND u.onboarding_complete=true
        AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=${viewer}::uuid AND b.blocked_id=u.id) OR (b.blocked_id=${viewer}::uuid AND b.blocker_id=u.id))
        AND NOT EXISTS (SELECT 1 FROM follows WHERE follower_id=${viewer}::uuid AND following_id=u.id)
      ORDER BY CASE WHEN u.institution_id IS NOT NULL AND u.institution_id=(SELECT institution_id FROM users WHERE id=${viewer}::uuid) THEN 1 ELSE 0 END DESC,
        (SELECT count(*) FROM user_interests c JOIN user_interests v ON v.tag_id=c.tag_id WHERE c.user_id=u.id AND v.user_id=${viewer}::uuid) DESC,
        u.follower_count DESC, u.id ASC`);
    return result.rows.map(row => row.id);
  }
  it("preserves ranking, duplicate-interest weights, exclusions, and offsets", async () => {
    const original = await originalOrder();
    expect(original).toEqual([people[2], people[0], people[1]]);
    const first = await repo.getFollowSuggestions(viewer, 2, 0), second = await repo.getFollowSuggestions(viewer, 2, 2);
    expect([...first.rows, ...second.rows].map(row => row.id)).toEqual(original);
    await db.execute(sql`UPDATE users SET institution_id=NULL WHERE id=${viewer}::uuid`);
    try {
      const next = await repo.getFollowSuggestions(viewer, 10);
      expect(next.rows.map(row => row.id)).toEqual(await originalOrder());
      expect(next.rows.map(row => row.id)).toEqual([people[0], people[1], people[2]]);
    } finally { await db.execute(sql`UPDATE users SET institution_id=${institution}::uuid WHERE id=${viewer}::uuid`); }
  });
});
