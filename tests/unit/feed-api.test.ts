import { afterEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/feed/read", () => ({ readFeed: m.read }));
vi.mock("@/lib/db/client", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: m.limit }) }) }) } }));
import { GET } from "@/app/api/feed/route";
const url = "https://example.test/api/feed?view=latest&before=12345678-1234-1234-1234-123456789abc&beforeKind=post&beforeAt=2026-01-01T00%3A00%3A00.123456Z";
afterEach(() => vi.clearAllMocks());
describe("feed API", () => {
  it("requires an authenticated active onboarded account", async () => {
    m.auth.mockResolvedValueOnce(null);
    expect((await GET(new Request(url))).status).toBe(401);
    m.auth.mockResolvedValue({ user: { id: "user" } }); m.limit.mockResolvedValueOnce([{ status: "suspended", onboarded: true }]);
    expect((await GET(new Request(url))).status).toBe(403);
    expect(m.read).not.toHaveBeenCalled();
  });
  it("rejects invalid cursors and uses private, uncached viewer-specific reads", async () => {
    m.auth.mockResolvedValue({ user: { id: "user" } }); m.limit.mockResolvedValue([{ status: "active", onboarded: true }]);
    expect((await GET(new Request(url.replace("2026-01-01", "2026-02-30")))).status).toBe(400);
    m.read.mockResolvedValue({ items: [], hasMore: false });
    const response = await GET(new Request(url));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(m.read).toHaveBeenCalledWith("user", "latest", "12345678-1234-1234-1234-123456789abc", "post", "2026-01-01T00:00:00.123456Z");
  });  it("bounds and validates event refreshes while still using the viewer's filtered query", async () => {
    m.auth.mockResolvedValue({ user: { id: "user" } }); m.limit.mockResolvedValue([{ status: "active", onboarded: true }]);
    m.read.mockResolvedValue({ items: [], hasMore: false });
    const valid = "https://example.test/api/feed?view=following&events=post%3A12345678-1234-1234-1234-123456789abc";
    expect((await GET(new Request(valid))).status).toBe(200);
    expect(m.read).toHaveBeenCalledWith("user", "following", undefined, undefined, undefined, [{ kind: "post", id: "12345678-1234-1234-1234-123456789abc" }]);
    expect((await GET(new Request(valid.replace("post%3A", "invalid%3A")))).status).toBe(400);
  });

});
