import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), execute: vi.fn(), findMany: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { execute: mocks.execute, query: { documentBookmarks: { findMany: mocks.findMany } } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
import { GET, POST, DELETE } from "@/app/api/bookmarks/route";

const doc = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const user = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const request = (method: string, documentId = doc) => new NextRequest("http://localhost/api/bookmarks", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId }) });
const query = (value: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(value);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: user } });
  mocks.send.mockResolvedValue(undefined);
});

describe("saved resources", () => {
  it("requires a session before accessing data", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request("POST"))).status).toBe(401);
    expect((await GET(new NextRequest("http://localhost/api/bookmarks"))).status).toBe(401);
    expect((await DELETE(request("DELETE"))).status).toBe(401);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("rejects malformed ids and inaccessible resources without sending an event", async () => {
    expect((await POST(request("POST", "bad"))).status).toBe(400);
    mocks.execute.mockResolvedValue({ rows: [{ eligible: false, changed: false }] });
    expect((await POST(request("POST"))).status).toBe(404);
    const statement = query(mocks.execute.mock.calls[0][0]);
    expect(statement.sql).toMatch(/status = 'approved'/);
    expect(statement.sql).toMatch(/visibility = 'public'/);
    expect(statement.sql).toMatch(/deleted_at IS NULL/);
    expect(statement.sql).toContain("ON CONFLICT (user_id, document_id) DO NOTHING");
    expect(statement.params).toEqual([doc, user]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("sends an event only for a new save and does not fail a committed save on event failure", async () => {
    mocks.execute.mockResolvedValue({ rows: [{ eligible: true, changed: false }] });
    expect((await POST(request("POST"))).status).toBe(200);
    expect(mocks.send).not.toHaveBeenCalled();
    mocks.execute.mockResolvedValue({ rows: [{ eligible: true, changed: true }] });
    mocks.send.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(request("POST"))).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledOnce();
    log.mockRestore();
  });
  it("removes only the current user's bookmark and decrements only when removed", async () => {
    mocks.execute.mockResolvedValue({ rows: [] });
    expect((await DELETE(request("DELETE"))).status).toBe(200);
    const statement = query(mocks.execute.mock.calls[0][0]);
    expect(statement.params).toEqual([doc, user]);
    expect(statement.sql).toContain("SELECT document_id FROM removed");
    expect(statement.sql).toContain("GREATEST(0, bookmark_count - 1)");
  });
  it("lists only the user's public resources and excludes file URLs", async () => {
    mocks.findMany.mockResolvedValue([]);
    const response = await GET(new NextRequest("http://localhost/api/bookmarks"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const opts = mocks.findMany.mock.calls[0][0];
    const statement = query(opts.where);
    expect(statement.params).toEqual([user]);
    expect(statement.sql).toContain("'approved'");
    expect(statement.sql).toContain("'public'");
    expect(opts.with.document.columns.fileUrl).toBeUndefined();
  });
  it("rejects invalid and oversized pagination", async () => {
    for (const query of ["page=0", "page=1foo", "limit=51", "limit=-1"]) {
      expect((await GET(new NextRequest(`http://localhost/api/bookmarks?${query}`))).status).toBe(400);
    }
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
