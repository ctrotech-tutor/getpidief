import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), count: vi.fn(), unread: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { query: { notifications: { findMany: mocks.findMany } }, select: () => ({ from: () => ({ where: mocks.count }) }) } }));
vi.mock("@/lib/db/repositories/notifications", () => ({ notificationsRepository: { getUnreadCount: mocks.unread } }));
vi.mock("@/lib/redis/client", () => ({ KEYS: {}, invalidateCache: vi.fn() }));
import { GET } from "@/app/api/notifications/route";
const request = (query: string) => new NextRequest(`http://localhost/api/notifications${query}`);
afterEach(() => vi.resetAllMocks());
describe("notification pagination", () => {
  it.each(["?page=0", "?page=-1", "?page=1x", "?limit=0", "?limit=101", "?limit=999999", "?page=999999999999999999", "?page=1002&limit=100", "?type=bogus"])('rejects %s before querying', async query => {
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } });
    expect((await GET(request(query))).status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled(); expect(mocks.count).not.toHaveBeenCalled();
  });
  it("retains bounded page and type filtering", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } }); mocks.findMany.mockResolvedValue([]); mocks.count.mockResolvedValue([{ count: 7 }]);
    const result = await GET(request("?page=2&limit=3&type=follow"));
    expect(result.status).toBe(200); expect(await result.json()).toEqual({ data: { notifications: [], total: 7, page: 2, totalPages: 3 } });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 3, offset: 3 }));
  });
  it("continues supporting unread-count requests", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } }); mocks.unread.mockResolvedValue(4);
    const result = await GET(request("?count=true")); expect(await result.json()).toEqual({ data: { unreadCount: 4 } });
  });
});
