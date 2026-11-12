import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ config: null as null | { callbacks: { jwt: (args: unknown) => Promise<Record<string, unknown> | null>; signIn: (args: unknown) => Promise<unknown> } }, profile: vi.fn(), account: vi.fn() }));
vi.unmock("@/lib/auth/auth");
vi.mock("next-auth", () => ({ default: (config: unknown) => { mock.config = config as NonNullable<typeof mock.config>; return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }; } }));
vi.mock("@auth/drizzle-adapter", () => ({ DrizzleAdapter: () => ({}) }));
vi.mock("@/lib/db/client", () => ({ db: { query: { users: { findFirst: mock.profile }, authUsers: { findFirst: mock.account } } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn() } }));
vi.mock("@/lib/redis/client", () => ({ redisRateLimit: {}, rateLimiters: { login: { limit: vi.fn() } } }));
import "@/lib/auth/auth";

describe("session update security", () => {
  it("ignores client-provided authorization fields and reloads the profile", async () => {
    mock.account.mockResolvedValue({ sessionVersion: 1 });
    mock.profile.mockResolvedValue({ role: "student", status: "active", onboardingComplete: false, username: "learner", displayName: "Learner", avatarUrl: null, institutionId: null, verificationStatus: "unverified", reputationScore: 0, reputationLevel: "scholar" });
    const token = await mock.config!.callbacks.jwt({ token: { id: "user-1", role: "student", sessionVersion: 1 }, trigger: "update", session: { role: "super_admin", id: "other-user", status: "active" } });
    expect(token?.role).toBe("student");
    expect(token?.id).toBe("user-1");
    expect(mock.profile).toHaveBeenCalledOnce();
  });
  it("rejects old, missing and revoked token versions", async () => {
    mock.account.mockResolvedValue({ sessionVersion: 2 });
    expect(await mock.config!.callbacks.jwt({ token: { id: "user-1", sessionVersion: 1 } })).toBeNull();
    expect(await mock.config!.callbacks.jwt({ token: { id: "user-1" } })).toBeNull();
    mock.account.mockResolvedValue(null);
    expect(await mock.config!.callbacks.jwt({ token: { id: "user-1", sessionVersion: 2 } })).toBeNull();
  });
  it("rejects credentials verified concurrently with a reset", async () => {
    mock.account.mockResolvedValue({ sessionVersion: 2 });
    expect(await mock.config!.callbacks.jwt({ token: {}, user: { id: "user-1", sessionVersion: 1 } })).toBeNull();
  });
  it("issues a versioned token on sign-in", async () => {
    mock.account.mockResolvedValue({ sessionVersion: 2 });
    mock.profile.mockResolvedValue({ role: "student", status: "active", onboardingComplete: false, username: "learner" });
    const token = await mock.config!.callbacks.jwt({ token: {}, user: { id: "user-1", sessionVersion: 2 } });
    expect(token?.sessionVersion).toBe(2);
  });
});


describe("Google sign-in policy", () => {
  it("allows a new Google identity only with a verified email", async () => {
    mock.profile.mockResolvedValue(null);
    const base = { user: { id: "provider-id" }, account: { provider: "google" } };
    expect(await mock.config!.callbacks.signIn({ ...base, profile: { email: "a@example.com", email_verified: true } })).toBe(true);
    expect(await mock.config!.callbacks.signIn({ ...base, profile: { email: "a@example.com", email_verified: false } })).toBe(false);
    expect(await mock.config!.callbacks.signIn({ ...base, profile: { email_verified: true } })).toBe(false);
  });
  it("rejects suspended and deleted linked users", async () => {
    const args = { user: { id: "local-id" }, account: { provider: "google" }, profile: { email: "a@example.com", email_verified: true } };
    mock.profile.mockResolvedValue({ status: "suspended", deletedAt: null });
    expect(await mock.config!.callbacks.signIn(args)).toBe(false);
    mock.profile.mockResolvedValue({ status: "active", deletedAt: new Date() });
    expect(await mock.config!.callbacks.signIn(args)).toBe(false);
    mock.profile.mockResolvedValue({ status: "active", deletedAt: null });
    expect(await mock.config!.callbacks.signIn(args)).toBe(true);
  });
  it("uses local profile data when issuing an OAuth session", async () => {
    mock.account.mockResolvedValue({ sessionVersion: 3 });
    mock.profile.mockResolvedValue({ role: "student", status: "active", deletedAt: null, onboardingComplete: true, username: "local", displayName: "Local" });
    const token = await mock.config!.callbacks.jwt({ token: {}, user: { id: "local-id", name: "Google name" } });
    expect(token?.username).toBe("local");
    expect(token?.onboardingComplete).toBe(true);
    expect(token?.sessionVersion).toBe(3);
  });
});
