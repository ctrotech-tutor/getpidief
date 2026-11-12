import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), following: vi.fn(), suggestions: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }) } }));
vi.mock("@/lib/db/repositories/users", () => ({ usersRepository: { getFollowing: mocks.following, getFollowSuggestions: mocks.suggestions } }));
import { GET } from "@/app/api/feed/people/route";
afterEach(() => vi.resetAllMocks());
describe("feed people API", () => {
  it("requires an active onboarded account", async () => {
    mocks.auth.mockResolvedValueOnce(null); expect((await GET()).status).toBe(401);
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } }); mocks.limit.mockResolvedValue([{ status: "suspended", onboarded: true }]);
    expect((await GET()).status).toBe(403); expect(mocks.following).not.toHaveBeenCalled();
  });
  it("returns only public rail fields and is private and uncached", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "viewer" } }); mocks.limit.mockResolvedValue([{ status: "active", onboarded: true }]);
    mocks.following.mockResolvedValue({ total: 1, following: [{ id: "ada", username: "ada", displayName: "Ada", avatarUrl: null, secret: "omit" }] });
    mocks.suggestions.mockResolvedValue({ rows: [] });
    const response = await GET(); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.following).toHaveBeenCalledWith("viewer", { viewerId: "viewer", limit: 3 });
    expect(await response.json()).toEqual({ following: { total: 1, following: [{ id: "ada", username: "ada", displayName: "Ada", avatarUrl: null }] }, suggestions: [] });
  });
});
