import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// This test writes and deletes accounts only in an explicitly opted-in disposable DB.
const enabled = process.env.TEST_DATABASE_WRITE === "yes" && Boolean(process.env.TEST_DATABASE_URL);
vi.mock("@/lib/auth/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/redis/client", () => ({ redis: {}, redisRateLimit: {}, KEYS: {}, TTL: {}, rateLimiters: { register: { limit: async () => ({ success: true }) } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }));
const testEmail = `auth-test-${crypto.randomUUID()}@example.test`;
describe.skipIf(!enabled)("registration with isolated PostgreSQL", () => {
  let safeDatabase = false;
  beforeAll(() => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Write tests require a local, disposable database whose name ends in _test");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    safeDatabase = true;
  });
  afterAll(async () => {
    if (!safeDatabase) return;
    const { db } = await import("@/lib/db/client");
    const { authUsers } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(authUsers).where(eq(authUsers.email, testEmail));
    await db.$client.end();
  });
  it("persists credential, profile, agreement and self-description, rejecting duplicate email", async () => {
    const { registerWithCredentials } = await import("@/lib/auth/actions");
    const { db } = await import("@/lib/db/client");
    const { accountAgreements, authAccounts, authUsers, users } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const f = new FormData();
    for (const [k, v] of Object.entries({ firstName: "Ada", lastName: "Lovelace", email: testEmail, password: "Password1!", confirmPassword: "Password1!", acceptTerms: "on", isAcademicResearcher: "on" })) f.set(k, v);
    const state = { success: false as const, error: "" };
    expect((await registerWithCredentials(state, f)).success).toBe(true);
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, testEmail));
    expect(await db.select().from(authAccounts).where(eq(authAccounts.userId, user.id))).toHaveLength(1);
    expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(1);
    const [agreement] = await db.select().from(accountAgreements).where(eq(accountAgreements.userId, user.id));
    expect(agreement).toMatchObject({ isAcademicResearcherOrStudent: true, termsVersion: "legacy-2024", privacyVersion: "legacy-2024" });
    const duplicate = await registerWithCredentials(state, f);
    expect(duplicate.success).toBe(false);
    if (!duplicate.success) expect(duplicate.field).toBe("email");
  });
});
