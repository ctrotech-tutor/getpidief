import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
const m = vi.hoisted(() => ({ auth: vi.fn(), execute: vi.fn(), incr: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db/client", () => ({ db: { execute: m.execute } }));
vi.mock("@/lib/redis/client", () => ({ redis: null, KEYS: { viewCountBuffer: (id: string) => id }, incrCounter: m.incr }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: m.send } }));
import { POST } from "@/app/api/documents/[id]/view/route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const req = () => new NextRequest("http://localhost/api/view", { method: "POST", headers: { cookie: "__session=SECRET_COOKIE", referer: "https://example.test/private?token=SECRET" } });
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue(null); m.incr.mockResolvedValue(undefined); m.send.mockResolvedValue(undefined); });
describe("document view tracking", () => {
  it("rejects malformed IDs without database or counter activity", async () => {
    expect((await POST(req(), params("bad"))).status).toBe(400); expect(m.execute).not.toHaveBeenCalled();
  });
  it("records only eligible public approved resources and does not store cookies or referrer", async () => {
    m.execute.mockResolvedValueOnce({ rows: [] });
    expect((await POST(req(), params())).status).toBe(404);
    expect(m.incr).not.toHaveBeenCalled();
    const query = new PgDialect().sqlToQuery(m.execute.mock.calls[0][0]);
    expect(query.sql).toContain("visibility = 'public'"); expect(query.sql).toContain("status = 'approved'");
    expect(query.sql).toContain("FOR UPDATE");
    expect(JSON.stringify(query.params)).not.toContain("SECRET");
  });
  it("returns success even when subsequent analytics services fail", async () => {
    m.auth.mockResolvedValue({ user: { id } }); m.execute.mockResolvedValue({ rows: [{ id }] });
    m.incr.mockRejectedValue(new Error("offline")); m.send.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await POST(req(), params());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
    log.mockRestore();
  });
});
