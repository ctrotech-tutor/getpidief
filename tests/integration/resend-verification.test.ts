import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ find: vi.fn(), send: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ db: { query: { authUsers: { findFirst: m.find } } } }));
vi.mock("@/lib/redis/client", () => ({ redis: {}, redisRateLimit: {}, rateLimiters: { verificationResend: { limit: m.limit } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: m.send } }));
import { POST } from "@/app/api/auth/resend-verification/route";
const request = () => new NextRequest("http://localhost/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email: "user@example.com" }), headers: { "Content-Type": "application/json" } });
beforeEach(() => { vi.clearAllMocks(); m.limit.mockResolvedValue({ success: true }); m.send.mockResolvedValue(undefined); });
describe("verification resend", () => {
  it("gives the same response whether an account exists or is already verified", async () => {
    m.find.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "1", email: "user@example.com", emailVerified: new Date(), name: "User" });
    const missing = await POST(request()); const verified = await POST(request());
    expect(missing.status).toBe(200); expect(verified.status).toBe(200);
    expect(await missing.json()).toEqual(await verified.json()); expect(m.send).not.toHaveBeenCalled();
  });
  it("requests the worker event only for an unverified account", async () => {
    m.find.mockResolvedValue({ id: "1", email: "user@example.com", emailVerified: null, name: "User" });
    expect((await POST(request())).status).toBe(200);
    expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ name: "email/send-verification" }));
  });
  it("rejects excessive requests before querying accounts", async () => {
    m.limit.mockResolvedValue({ success: false });
    expect((await POST(request())).status).toBe(429); expect(m.find).not.toHaveBeenCalled();
  });
});
