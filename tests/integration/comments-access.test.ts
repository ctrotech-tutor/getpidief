import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ db: { query: { documents: { findFirst: vi.fn() }, comments: { findFirst: vi.fn(), findMany: vi.fn() }, users: { findFirst: vi.fn() } }, insert: vi.fn(), execute: vi.fn() } }));
vi.mock("@/lib/redis/client", () => ({ rateLimiters: { comment: { limit: vi.fn() } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn() } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) }, CHANNELS: { privateDocument: (id: string) => id }, EVENTS: { COMMENT_POSTED: "comment" } }));

import { GET, POST } from "@/app/api/comments/route";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth/auth";
import { rateLimiters } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { pusherServer } from "@/lib/pusher/server";

const id = "11111111-1111-4111-8111-111111111111";
const parent = "22222222-2222-4222-8222-222222222222";
const get = (query: string) => new NextRequest(`http://localhost/api/comments?${query}`);
const post = (parentId?: string) => new NextRequest("http://localhost/api/comments", { method: "POST", body: JSON.stringify({ documentId: id, content: "A useful reply", parentId }) });
const queryParts = (where: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(where);

describe("comment access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" }, expires: "" } as never);
    vi.mocked(rateLimiters.comment.limit).mockResolvedValue({ success: true } as never);
  });

  it("does not list comments for a document outside the public policy", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(undefined);
    expect((await GET(get(`documentId=${id}`))).status).toBe(404);
    expect(db.query.comments.findMany).not.toHaveBeenCalled();
    const query = queryParts(vi.mocked(db.query.documents.findFirst).mock.calls[0][0]!.where as never);
    expect(query.sql).toContain('"visibility"');
    expect(query.sql).toContain('"deleted_at" is null');
    expect(query.params).toEqual([id, "approved", "public"]);
  });

  it("rejects malformed and excessive pagination", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue({ id } as never);
    for (const pagination of ["limit=100", "page=0", "page=1abc", "limit=-1"]) {
      expect((await GET(get(`documentId=${id}&${pagination}`))).status).toBe(400);
    }
    expect(db.query.comments.findMany).not.toHaveBeenCalled();
  });

  it("does not allow commenting on unavailable documents", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue(undefined);
    expect((await POST(post())).status).toBe(404);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("requires a nondeleted parent in the same document", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue({ authorId: "owner" } as never);
    vi.mocked(db.query.comments.findFirst).mockResolvedValue(undefined);
    expect((await POST(post(parent))).status).toBe(404);
    const query = queryParts(vi.mocked(db.query.comments.findFirst).mock.calls[0][0]!.where as never);
    expect(query.params).toEqual([parent, id, false]);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns a rate-limit response rather than an authentication error", async () => {
    vi.mocked(rateLimiters.comment.limit).mockResolvedValue({ success: false } as never);
    expect((await POST(post())).status).toBe(429);
  });
  it("writes a comment and counters atomically and preserves success if notifications fail", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue({ authorId: "owner" } as never);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({ username: "user" } as never);
    vi.mocked(db.execute).mockResolvedValue({ rows: [{ id: parent, created_at: "2026-01-01T00:00:00Z" }] } as never);
    vi.mocked(pusherServer.trigger).mockResolvedValue(undefined as never);
    vi.mocked(inngest.send).mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(post())).status).toBe(201);
    const sql = queryParts(vi.mocked(db.execute).mock.calls[0][0] as never).sql;
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("INSERT INTO comments");
    expect(sql).toContain("comment_count = comment_count + 1");
    expect(sql).toContain("reply_count = reply_count + 1");
    log.mockRestore();
  });

  it("checks the parent belongs to the document when reading replies", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue({ id } as never);
    vi.mocked(db.query.comments.findFirst).mockResolvedValue(undefined);
    expect((await GET(get(`documentId=${id}&parentId=${parent}`))).status).toBe(404);
    const query = queryParts(vi.mocked(db.query.comments.findFirst).mock.calls[0][0]!.where as never);
    expect(query.params).toEqual([parent, id, false]);
    expect(db.query.comments.findMany).not.toHaveBeenCalled();
  });

  it("uses a bounded page and returns accurate hasMore without caching", async () => {
    vi.mocked(db.query.documents.findFirst).mockResolvedValue({ id } as never);
    vi.mocked(db.query.comments.findMany).mockResolvedValue([{ id: "one" }, { id: "two" }] as never);
    const result = await GET(get(`documentId=${id}&limit=1`));
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect((await result.json()).data).toMatchObject({ comments: [{ id: "one" }], hasMore: true });
    expect(vi.mocked(db.query.comments.findMany).mock.calls[0][0]!.limit).toBe(2);
  });

});
