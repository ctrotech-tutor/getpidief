import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ insert: vi.fn(), transaction: vi.fn(), send: vi.fn(), getdel: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/db/client", () => ({ db: { transaction: m.transaction, update: m.update } }));
vi.mock("@/lib/redis/client", () => ({ redis: { getdel: m.getdel }, redisRateLimit: {}, KEYS: { emailVerifyToken: (t: string) => t }, TTL: {}, rateLimiters: { register: { limit: async () => ({ success: true }) } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: m.send } }));
import { registerWithCredentials, verifyEmailAddress } from "@/lib/auth/actions";
import { accountAgreements, authAccounts, authUsers, users } from "@/lib/db/schema";
const state = { success: false as const, error: "" };
function form(accepted = true) { const f = new FormData(); for (const [k, v] of Object.entries({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", password: "Password1!", confirmPassword: "Password1!", ...(accepted ? { acceptTerms: "on", isAcademicResearcher: "on" } : {}) })) f.set(k, v); return f; }
beforeEach(() => {
  vi.clearAllMocks();
  m.insert.mockImplementation(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "a1b2c3d4-aaaa-4444-aaaa-123456789abc" }]) })) }));
  m.transaction.mockImplementation(async fn => fn({ insert: m.insert }));
  m.send.mockResolvedValue(undefined);
});
describe("credential registration", () => {
  it("requires agreement before any writes", async () => {
    expect((await registerWithCredentials(state, form(false))).success).toBe(false);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("inserts account, profile and agreement in a transaction and uses the registered verification event", async () => {
    const result = await registerWithCredentials(state, form());
    expect(result.success).toBe(true);
    expect(m.insert.mock.calls.map(call => call[0])).toEqual([authUsers, authAccounts, users, accountAgreements]);
    const agreementValues = m.insert.mock.results[3].value.values.mock.calls[0][0];
    expect(agreementValues).toMatchObject({ termsVersion: "legacy-2024", privacyVersion: "legacy-2024", isAcademicResearcherOrStudent: true });
    expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ name: "email/send-verification" }));
  });
  it("reports a created account honestly if verification dispatch fails", async () => {
    m.send.mockRejectedValueOnce(new Error("offline"));
    const result = await registerWithCredentials(state, form());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toMatch(/could not request/i);
  });
  it("consumes a verification token exactly once on explicit submission", async () => {
    m.getdel.mockResolvedValueOnce({ userId: "a1b2c3d4-aaaa-4444-aaaa-123456789abc", email: "ada@example.com" }).mockResolvedValueOnce(null);
    m.update.mockReturnValue({ set: () => ({ where: () => ({ returning: async () => [{ id: "a1b2c3d4-aaaa-4444-aaaa-123456789abc" }] }) }) });
    const data = new FormData(); data.set("token", "validToken12345678901234567890");
    expect((await verifyEmailAddress(state, data)).success).toBe(true);
    expect((await verifyEmailAddress(state, data)).success).toBe(false);
  });
});
