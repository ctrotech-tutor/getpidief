import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
const mock = vi.hoisted(() => ({ id: "", send: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ requireAuth: async () => mock.id, auth: async () => ({ user: { id: mock.id } }) }));
vi.mock("@/lib/redis/client", () => ({ redis: null, KEYS: { onboardingState: () => "state", recommended: () => "recommended" } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mock.send } }));

describe.skipIf(!enabled)("onboarding with disposable PostgreSQL", () => {
  const ids = { empty: randomUUID(), learner: randomUUID(), inst: randomUUID(), inactive: randomUUID(), tags: [randomUUID(), randomUUID(), randomUUID()] };
  let db: typeof import("@/lib/db/client").db;
  let actions: typeof import("@/lib/auth/onboardingActions");
  let resolve: typeof import("@/lib/auth/onboardingResume").resolveOnboardingStep;
  const skip = () => { const f = new FormData(); f.set("skip", "yes"); return f; };
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Requires a local disposable database ending in _test");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    actions = await import("@/lib/auth/onboardingActions");
    ({ resolveOnboardingStep: resolve } = await import("@/lib/auth/onboardingResume"));
    for (const id of [ids.empty, ids.learner]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role) VALUES (${id}::uuid, ${id}, 'Test learner', 'contributor')`);
    }
    mock.send.mockResolvedValue({});
  });
  afterAll(async () => {
    if (!db) return;
    try {
      await db.execute(sql`DELETE FROM auth_users WHERE id IN (${ids.empty}::uuid, ${ids.learner}::uuid)`);
      for (const id of ids.tags) await db.execute(sql`DELETE FROM tags WHERE id = ${id}::uuid`);
      await db.execute(sql`DELETE FROM institutions WHERE id IN (${ids.inst}::uuid, ${ids.inactive}::uuid)`);
    } finally { await db.$client.end(); }
  });
  it("persists skipped steps on an empty database and completes exactly once", async () => {
    mock.id = ids.empty;
    expect(await resolve()).toBe(1);
    expect((await actions.saveOnboardingStep1(null, skip())).success).toBe(true);
    expect(await resolve()).toBe(2);
    expect((await actions.saveOnboardingStep2(null, skip())).success).toBe(true);
    expect(await resolve()).toBe(3);
    await actions.saveOnboardingStep1(null, skip()); // revisiting cannot regress progress
    expect(await resolve()).toBe(3);
    await Promise.all([actions.saveOnboardingStep3(null, skip()), actions.saveOnboardingStep3(null, skip())]);
    const row = (await db.execute<{onboarding_complete: boolean; role: string}>(sql`SELECT onboarding_complete, role FROM users WHERE id = ${ids.empty}::uuid`)).rows[0];
    expect(row).toMatchObject({ onboarding_complete: true, role: "contributor" });
    expect(mock.send).toHaveBeenCalledTimes(1);
  });
  it("validates choices, searches punctuation safely, and persists selected interests", async () => {
    mock.id = ids.learner; mock.send.mockClear();
    await db.execute(sql`INSERT INTO institutions (id, name, slug, country, country_code, is_active) VALUES (${ids.inst}::uuid, 'St. John''s College', ${ids.inst}, 'Nigeria', 'NG', true), (${ids.inactive}::uuid, 'Unavailable School', ${ids.inactive}, 'Nigeria', 'NG', false)`);
    const result = await actions.searchInstitutions("John's");
    expect(result.some(x => x.id === ids.inst)).toBe(true);
    expect(await actions.searchInstitutions("%_")).toEqual([]);
    const choice = new FormData(); choice.set("institutionId", ids.inactive);
    expect((await actions.saveOnboardingStep1(null, choice)).success).toBe(false);
    choice.set("institutionId", ids.inst); expect((await actions.saveOnboardingStep1(null, choice)).success).toBe(true);
    const study = new FormData(); study.set("faculty", "Law"); study.set("major", "International Law"); study.set("academicLevel", "other");
    expect((await actions.saveOnboardingStep2(null, study)).success).toBe(true);
    for (const id of ids.tags) await db.execute(sql`INSERT INTO tags (id, name, slug) VALUES (${id}::uuid, ${id}, ${id})`);
    const selected = new FormData(); ids.tags.forEach(id => selected.append("tagIds", id));
    expect((await actions.saveOnboardingStep3(null, selected)).success).toBe(true);
    const row = (await db.execute<{n: number}>(sql`SELECT count(*)::int AS n FROM user_interests WHERE user_id = ${ids.learner}::uuid`)).rows[0];
    expect(row.n).toBe(3);
    expect(mock.send).toHaveBeenCalledTimes(1);
  });
});
