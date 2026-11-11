import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), execute: vi.fn(), send: vi.fn(), trigger: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ withTransaction: (fn: (tx: object) => unknown) => fn({ execute: mocks.execute }) }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: mocks.trigger }, CHANNELS: { privateDocument: (id: string) => id }, EVENTS: { REACTION_UPDATED: "reaction" } }));
import { POST } from "@/app/api/documents/[id]/react/route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", user = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
const req = (body: unknown) => new NextRequest("http://localhost/api/react", { method: "POST", body: JSON.stringify(body) });
const doc = { author_id: user, like_count: 5, dislike_count: 3 };
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: user } }); mocks.trigger.mockResolvedValue(undefined); mocks.send.mockResolvedValue(undefined); });
describe("document reactions", () => {
  it("rejects unauthenticated requests and malformed input", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await POST(req({ reaction: "like" }), params())).status).toBe(401);
    expect((await POST(req({ reaction: "like" }), params("bad"))).status).toBe(400);
    expect((await POST(req({ reaction: "angry" }), params())).status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("locks and checks a public document and active account", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [] });
    expect((await POST(req({ reaction: "like" }), params())).status).toBe(404);
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0][0]);
    expect(query.sql).toContain("FOR UPDATE");
    expect(query.sql).toContain("visibility = 'public'");
    expect(query.sql).toContain("status = 'active'");
    expect(mocks.trigger).not.toHaveBeenCalled();
  });
  it("sets a like, returning server state and sending a notification", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [doc] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValue({ rows: [] });
    const response = await POST(req({ reaction: "like" }), params());
    expect((await response.json()).data).toEqual({ likeCount: 6, dislikeCount: 3, userReaction: "like" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.execute).toHaveBeenCalledTimes(4);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it("treats an explicit repeated reaction as a no-op", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [doc] }).mockResolvedValueOnce({ rows: [{ type: "like" }] });
    const response = await POST(req({ reaction: "like" }), params());
    expect((await response.json()).data).toEqual({ likeCount: 5, dislikeCount: 3, userReaction: "like" });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("switches reactions and preserves legacy toggle semantics", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [doc] }).mockResolvedValueOnce({ rows: [{ type: "dislike" }] }).mockResolvedValue({ rows: [] });
    expect((await (await POST(req({ reaction: "like" }), params())).json()).data).toEqual({ likeCount: 6, dislikeCount: 2, userReaction: "like" });
    mocks.execute.mockReset(); mocks.send.mockClear();
    mocks.execute.mockResolvedValueOnce({ rows: [doc] }).mockResolvedValueOnce({ rows: [{ type: "like" }] }).mockResolvedValue({ rows: [] });
    expect((await (await POST(req({ type: "like" }), params())).json()).data).toEqual({ likeCount: 4, dislikeCount: 3, userReaction: null });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not report failure after a commit when delivery fails", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [doc] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValue({ rows: [] });
    mocks.trigger.mockRejectedValue(new Error("offline")); mocks.send.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req({ reaction: "like" }), params())).status).toBe(200);
    log.mockRestore();
  });
});
