import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), candidates: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/feed/discovery", () => ({ discoveryCandidates: mocks.candidates }));
vi.mock("@/lib/db/client", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }) } }));
import { GET } from "@/app/api/feed/discovery/route";
afterEach(() => vi.clearAllMocks());
describe("discovery API", () => {
  it("requires an active onboarded viewer", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } });
    mocks.limit.mockResolvedValueOnce([{ status: "suspended", onboarded: true }]);
    expect((await GET()).status).toBe(403);
    expect(mocks.candidates).not.toHaveBeenCalled();
  });
  it("serves a private uncached candidate snapshot for that viewer", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } }); mocks.limit.mockResolvedValue([{ status: "active", onboarded: true }]);
    mocks.candidates.mockResolvedValue([]);
    const response = await GET();
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.candidates).toHaveBeenCalledWith("viewer");
    expect(await response.json()).toEqual({ candidates: [] });
  });
});
