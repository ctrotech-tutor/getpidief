import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
const cache = vi.hoisted(() => ({ ids: [] as string[], get: vi.fn(), set: vi.fn() }));
vi.mock("@/lib/redis/client", () => ({
  KEYS: { recommended: (id: string) => id, trendingGlobal: () => "global", trendingByCategory: (id: string) => id, trendingByInstitution: (id: string) => id },
  zgetTop: async () => cache.ids, getCache: cache.get, setCache: cache.set, invalidateCache: vi.fn(),
}));

describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("resource discovery on disposable PostgreSQL", () => {
  const viewer = randomUUID(), good = randomUUID(), blocked = randomUUID(), suspended = randomUUID(), tag = randomUUID();
  const authors = [viewer, good, blocked, suspended];
  const docs = Array.from({ length: 9 }, () => randomUUID()).sort();
  let db: typeof import("@/lib/db/client").db;
  let repo: typeof import("@/lib/db/repositories/documents").documentsRepository;
  beforeAll(async () => {
    const target = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client")); ({ documentsRepository: repo } = await import("@/lib/db/repositories/documents"));
    for (const user of authors) {
      await db.execute(sql`INSERT INTO auth_users(id,email) VALUES (${user}::uuid,${user+"@example.test"})`);
      await db.execute(sql`INSERT INTO users(id,username,display_name,onboarding_complete) VALUES (${user}::uuid,${"u"+user.replaceAll("-","")},'Fixture',true)`);
    }
    await db.execute(sql`UPDATE users SET status='suspended' WHERE id=${suspended}::uuid`);
    await db.execute(sql`INSERT INTO tags(id,name,slug) VALUES (${tag}::uuid,${tag},${tag})`);
    await db.execute(sql`INSERT INTO user_interests(user_id,tag_id) VALUES (${viewer}::uuid,${tag}::uuid),(${viewer}::uuid,${tag}::uuid)`);
    for (const [i, id] of docs.entries()) {
      const author = i === 4 ? blocked : i === 5 ? suspended : good;
      const visibility = i === 6 ? "private" : "public";
      const status = i === 7 ? "pending" : "approved";
      const score = [2, 2, 1, 100, 1000, 1000, 1000, 1000, 1000][i];
      await db.execute(sql`INSERT INTO documents(id,slug,title,author_id,file_url,status,visibility,published_at,trending_score,deleted_at) VALUES (${id}::uuid,${id},${'fixture-'+i},${author}::uuid,'test.pdf',${status}::document_status,${visibility}::visibility,now(),${score},${i===8 ? new Date() : null})`);
    }
    // Duplicate interests do not multiply scores; duplicate document links retain
    // current legacy weighting until an explicit integrity migration changes it.
    await db.execute(sql`INSERT INTO document_tags(document_id,tag_id) VALUES (${docs[2]}::uuid,${tag}::uuid)`);
    await db.execute(sql`INSERT INTO documents(id,slug,title,author_id,file_url,status,visibility,published_at)
      SELECT md5(${viewer}::text || '-' || n)::uuid, md5(${viewer}::text || '-' || n), 'viewed fixture', ${good}::uuid, 'test.pdf', 'approved', 'public', now() FROM generate_series(1,205) n`);
    await db.execute(sql`INSERT INTO document_views(user_id,document_id)
      SELECT ${viewer}::uuid, md5(${viewer}::text || '-' || n)::uuid FROM generate_series(1,205) n`);
    await db.execute(sql`INSERT INTO document_views(user_id,document_id) VALUES (${viewer}::uuid,${docs[3]}::uuid)`);
  });
  afterAll(async () => {
    if (!db) return;
    try { for (const id of authors) await db.execute(sql`DELETE FROM auth_users WHERE id=${id}::uuid`); await db.execute(sql`DELETE FROM tags WHERE id=${tag}::uuid`); }
    finally { await db.$client.end(); }
  });
  it("orders by relevance, excludes all seen documents, and filters hidden authors before limit", async () => {
    for (const [a,b] of [[viewer,blocked],[blocked,viewer]]) {
      await db.execute(sql`INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (${a}::uuid,${b}::uuid)`);
      try {
        expect((await repo.getRecommended(viewer, 2)).map(d => d.id)).toEqual([docs[2], docs[0]]);
        expect((await repo.getRecommended(viewer, 3)).map(d => d.id)).toEqual([docs[2], docs[0], docs[1]]);
        expect(cache.get).not.toHaveBeenCalled(); expect(cache.set).not.toHaveBeenCalled();
        cache.ids = [docs[6], docs[4], docs[5], docs[1], docs[0]];
        expect((await repo.getTrending({ limit: 5, requestingUserId: viewer })).map(d => d.id)).toEqual([docs[1], docs[0]]);
        const recent = await repo.getRecent({ limit: 300, requestingUserId: viewer });
        expect(recent.some(d => new Set<string>([docs[4], docs[5], docs[6], docs[7], docs[8]]).has(d.id))).toBe(false);
        expect(recent.some(d => d.id === docs[0])).toBe(true);
        cache.ids = [];
        const fallback = await repo.getTrending({ limit: 300, requestingUserId: viewer });
        expect(fallback.some(d => d.id === docs[4])).toBe(false);
        expect(await repo.getTrending({ limit: 300, categoryId: randomUUID(), requestingUserId: viewer })).toEqual([]);
        expect(await repo.getTrending({ limit: 300, institutionId: randomUUID(), requestingUserId: viewer })).toEqual([]);
      } finally { await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id=${a}::uuid AND blocked_id=${b}::uuid`); }
    }
  });
  it("rechecks hydration visibility and never falls back to seen recommendations", async () => {
    cache.ids = [];
    await db.execute(sql`UPDATE documents SET visibility='private' WHERE id=${docs[0]}::uuid`);
    expect((await repo.getByIds([docs[0],docs[1]], viewer)).map(d => d.id)).toEqual([docs[1]]);
    await db.execute(sql`INSERT INTO document_views(user_id,document_id) VALUES (${viewer}::uuid,${docs[1]}::uuid),(${viewer}::uuid,${docs[2]}::uuid),(${viewer}::uuid,${docs[4]}::uuid)`);
    expect(await repo.getRecommended(viewer, 6)).toEqual([]);
  });
});
