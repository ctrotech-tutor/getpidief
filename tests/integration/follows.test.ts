import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), follow: vi.fn(), unfollow: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/repositories/users", () => ({ usersRepository: { follow: mocks.follow, unfollow: mocks.unfollow } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
import { POST, DELETE } from "@/app/api/follows/route";
import { POST as postById, DELETE as deleteById } from "@/app/api/users/[id]/follow/route";
const me = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const request = (method: string, followingId: string) => new NextRequest("http://localhost/api/follows", { method, body: JSON.stringify({ followingId }) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: me } }); mocks.send.mockResolvedValue(undefined); });
describe("follow routes", () => {
  it("requires authentication and rejects invalid ids and self-follow on both endpoints", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await POST(request("POST", other))).status).toBe(401);
    expect((await POST(request("POST", me))).status).toBe(400);
    expect((await postById(request("POST", other), params("invalid"))).status).toBe(400);
    expect((await postById(request("POST", other), params(me))).status).toBe(400);
    expect((await deleteById(request("DELETE", other), params(me))).status).toBe(400);
    expect(mocks.follow).not.toHaveBeenCalled();
  });
  it("sends a notification only for a new follow and keeps success if it fails", async () => {
    mocks.follow.mockResolvedValueOnce({ changed: false }).mockResolvedValueOnce({ changed: true });
    expect((await POST(request("POST", other))).status).toBe(200);
    expect(mocks.send).not.toHaveBeenCalled();
    mocks.send.mockRejectedValueOnce(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await postById(request("POST", other), params(other))).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledOnce();
    log.mockRestore();
  });
  it("does not follow an unavailable account", async () => {
    mocks.follow.mockRejectedValue(new Error("NOT_FOUND"));
    expect((await POST(request("POST", other))).status).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("unfollows on either route for the authenticated user", async () => {
    mocks.unfollow.mockResolvedValue(undefined);
    expect((await DELETE(request("DELETE", other))).status).toBe(200);
    expect((await deleteById(request("DELETE", other), params(other))).status).toBe(200);
    expect(mocks.unfollow).toHaveBeenCalledWith(me, other);
  });
});
