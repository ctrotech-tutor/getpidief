import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
const mocks = vi.hoisted(() => ({ auth: vi.fn(), getCache: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/redis/client", () => ({ redis: null, redisRateLimit: {}, KEYS: { categories: () => 'categories', popularSearches: () => 'popular' }, getCache: mocks.getCache, zincrby: vi.fn().mockResolvedValue(0), rateLimiters: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("resource discovery on disposable PostgreSQL", () => {
  const viewer = randomUUID(), hidden = randomUUID(), visible = randomUUID();
  const ids = [viewer, hidden, visible];
  let db: typeof import("@/lib/db/client").db;
  let search: typeof import("@/lib/search/search");
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client")); search = await import("@/lib/search/search");
    for (const id of ids) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, 'Test', 'student'::user_role, true)`);
    }
    for (let i = 0; i < 6; i++) {
      const id = randomUUID(), author = i < 5 ? hidden : visible;
      const title = i < 5 ? `Celestial Hidden ${i}` : 'Celestial Visible';
      await db.execute(sql`INSERT INTO documents (id, slug, title, author_id, file_url, status, visibility, published_at, download_count, search_vector) VALUES
        (${id}::uuid, ${id}, ${title}, ${author}::uuid, 'test.pdf', 'approved', 'public', now() + ${i < 5 ? 10 : 0} * interval '1 second', ${100-i}, to_tsvector('english', ${title}))`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try { for (const id of ids) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`); }
    finally { await db.$client.end(); }
  });
  it("filters both directions before search counts and autocomplete limits", async () => {
    for (const [from, to] of [[viewer, hidden], [hidden, viewer]]) {
      await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${from}::uuid, ${to}::uuid)`);
      const result = await search.searchDocuments({ query: 'celestial', limit: 1 }, viewer);
      expect(result.total).toBe(1); expect(result.results[0].title).toBe('Celestial Visible');
      const autocomplete = await search.getAutocomplete('celestial', viewer);
      expect(autocomplete.filter(i => i.type === 'document').map(i => i.label)).toEqual(['Celestial Visible']);
      expect((await search.searchDocuments({ query: 'celestial' })).total).toBe(6);
      await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${from}::uuid AND blocked_id = ${to}::uuid`);
    }
    expect((await search.searchDocuments({ query: 'celestial' }, viewer)).total).toBe(6);
    expect(mocks.getCache.mock.calls.every(([key]) => key === 'categories')).toBe(true);
  });
});
