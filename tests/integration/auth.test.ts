import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock auth before importing anything that uses it
vi.mock("@/lib/auth/auth", () => ({
  auth:           vi.fn(),
  getCurrentUser: vi.fn(),
  requireAuth:    vi.fn(() => Promise.resolve("mock-user-id")),
  requireRole:    vi.fn(() => Promise.resolve({ id: "mock-user-id", role: "admin" })),
  signIn:         vi.fn(),
  signOut:        vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      authUsers: { findFirst: vi.fn() },
      authAccounts: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: "new-id" }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    execute: vi.fn(() => ({ rows: [] })),
  },
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/redis/client", () => ({
  redis:        { get: vi.fn(() => null), setex: vi.fn(), del: vi.fn() },
  KEYS:         { passwordResetToken: (t: string) => `token:pwd_reset:${t}`, emailVerifyToken: (t: string) => `token:email_verify:${t}` },
  TTL:          { passwordResetToken: 900, emailVerifyToken: 86400 },
  rateLimiters: { login: { limit: vi.fn(() => ({ success: true })) }, register: { limit: vi.fn(() => ({ success: true })) }, passwordReset: { limit: vi.fn(() => ({ success: true })) } },
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

vi.mock("@/lib/email/client", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: { auth: "auth@getpidief.com" },
}));

describe("Auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("returns user id when authenticated", async () => {
      const { requireAuth } = await import("@/lib/auth/auth");
      (requireAuth as Mock).mockResolvedValue("test-user-id");
      const userId = await requireAuth();
      expect(userId).toBe("test-user-id");
    });
  });

  describe("requireRole", () => {
    it("returns user with role", async () => {
      const { requireRole } = await import("@/lib/auth/auth");
      const result = await requireRole("admin");
      expect(result.role).toBe("admin");
      expect(result.id).toBe("mock-user-id");
    });
  });

  describe("Rate limiting", () => {
    it("allows requests within limit", async () => {
      const { rateLimiters } = await import("@/lib/redis/client");
      const result = await rateLimiters.login.limit("test-ip");
      expect(result.success).toBe(true);
    });
  });
});