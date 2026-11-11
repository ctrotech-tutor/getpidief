import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ getdel: vi.fn(), transaction: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/db/client", () => ({ db: { transaction: m.transaction } }));
vi.mock("@/lib/redis/client", () => ({ redis: { getdel: m.getdel }, redisRateLimit: {}, KEYS: { passwordResetToken: (key: string) => key }, TTL: {}, rateLimiters: {} }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn() } }));
import { resetPassword } from "@/lib/auth/actions";
import { authAccounts, authUsers } from "@/lib/db/schema";
const id = "a1b2c3d4-aaaa-4444-aaaa-123456789abc";
const state = { success: false as const, error: "" };
function form() { const data = new FormData(); data.set("token", "01234567890123456789012345678901"); data.set("password", "StrongPassword1!"); data.set("confirmPassword", "StrongPassword1!"); return data; }
beforeEach(() => {
  vi.clearAllMocks();
  m.getdel.mockResolvedValue(id);
  m.transaction.mockImplementation(async fn => fn({ update: m.update }));
  m.update.mockImplementation(table => ({ set: () => ({ where: () => table === authAccounts ? { returning: async () => [{ userId: id }] } : Promise.resolve() }) }));
});
describe("password reset session invalidation", () => {
  it("updates credentials and session version in the same transaction", async () => {
    const result = await resetPassword(state, form());
    expect(result.success).toBe(true);
    expect(m.transaction).toHaveBeenCalledOnce();
    expect(m.update.mock.calls.map(call => call[0])).toEqual([authAccounts, authUsers]);
  });
  it("does not revoke sessions when no credential account exists", async () => {
    m.update.mockReturnValue({ set: () => ({ where: () => ({ returning: async () => [] }) }) });
    expect((await resetPassword(state, form())).success).toBe(false);
    expect(m.update.mock.calls.map(call => call[0])).toEqual([authAccounts]);
  });
  it("reports transaction failure without claiming success", async () => {
    m.transaction.mockRejectedValue(new Error("database unavailable"));
    expect((await resetPassword(state, form())).success).toBe(false);
  });
});
