import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
const url = process.env.TEST_DATABASE_URL;
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/redis/client", () => ({ KEYS: {}, invalidateCache: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); }, useRouter: () => ({ refresh: vi.fn() }) }));
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("follow suggestions page on disposable PostgreSQL", () => {
  const viewer = randomUUID(), people = Array.from({ length: 28 }, () => randomUUID());
  let db: typeof import("@/lib/db/client").db;
  let page: typeof import("@/app/(app)/who-to-follow/page").default;
  let users: typeof import("@/lib/db/repositories/users").usersRepository;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ default: page } = await import("@/app/(app)/who-to-follow/page"));
    ({ usersRepository: users } = await import("@/lib/db/repositories/users"));
    for (const [index, id] of [viewer, ...people].entries()) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete, follower_count) VALUES (${id}::uuid, ${"test" + id.replaceAll("-", "")}, ${"Person " + index}, 'student'::user_role, true, ${100 - index})`);
    }
    mocks.auth.mockResolvedValue({ user: { id: viewer } });
    await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${people[0]}::uuid, ${viewer}::uuid)`);
    await db.execute(sql`INSERT INTO follows (follower_id, following_id) VALUES (${viewer}::uuid, ${people[1]}::uuid)`);
  });
  afterAll(async () => {
    if (!db) return;
    try { for (const id of [viewer, ...people]) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`); }
    finally { await db.$client.end(); }
  });
  it("shows real eligible accounts across pages without blocked, self or followed accounts", async () => {
    const first = renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }));
    const second = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(first).toContain('href="/who-to-follow?page=2"');
    expect(second).toContain('href="/who-to-follow"');
    const names = [...first.matchAll(/aria-label="Follow Person (\d+)"/g), ...second.matchAll(/aria-label="Follow Person (\d+)"/g)].map(match => match[1]);
    expect(names).toHaveLength(26); expect(new Set(names).size).toBe(26);
    expect(names).not.toContain("0"); expect(names).not.toContain("1"); expect(names).not.toContain("2");
    await expect(users.getFollowSuggestions(viewer, 0)).rejects.toThrow("INVALID_PARAMS");
    await expect(users.getFollowSuggestions(viewer, 5, -1)).rejects.toThrow("INVALID_PARAMS");
  });
  it("redirects signed-out visitors", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    await expect(page({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/login");
  });
});
