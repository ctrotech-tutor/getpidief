import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ document: vi.fn(), actor: vi.fn(), auth: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db/client", () => ({ db: { query: { documents: { findFirst: m.document }, users: { findFirst: m.actor } } } }));
vi.mock("@/lib/storage/private-pdf", () => ({ privatePdfKey: (v: string) => v === "uploadthing-private:abc123" ? "abc123" : null, getPrivatePdfUrl: m.sign }));
import { GET } from "@/app/api/documents/[id]/file/route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const params = { params: Promise.resolve({ id }) };
const request = (headers?: HeadersInit) => new NextRequest(`http://localhost/api/documents/${id}/file`, { headers });
beforeEach(() => {
  vi.resetAllMocks();
  m.document.mockResolvedValue({ fileUrl: "uploadthing-private:abc123", status: "approved", visibility: "public" });
  m.auth.mockResolvedValue(null); m.sign.mockResolvedValue("https://provider.example/signed-secret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("pdf bytes", { status: 206, headers: { "Content-Range": "bytes 0-8/20", "Content-Length": "9", "Accept-Ranges": "bytes" } })));
});
afterEach(() => vi.unstubAllGlobals());
describe("private PDF read boundary", () => {
  it("streams an approved public document without revealing the provider URL", async () => {
    const res = await GET(request({ range: "bytes=0-8" }), params);
    expect(res.status).toBe(206); expect(await res.text()).toBe("pdf bytes");
    expect(res.headers.get("content-range")).toBe("bytes 0-8/20");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("location")).toBeNull();
    expect(fetch).toHaveBeenCalledWith("https://provider.example/signed-secret", expect.objectContaining({ headers: { Range: "bytes=0-8" }, redirect: "error" }));
  });
  it("refuses unapproved documents to anonymous or ordinary accounts", async () => {
    m.document.mockResolvedValue({ fileUrl: "uploadthing-private:abc123", status: "pending", visibility: "public" });
    expect((await GET(request(), params)).status).toBe(404);
    m.auth.mockResolvedValue({ user: { id } }); m.actor.mockResolvedValue({ role: "student" });
    expect((await GET(request(), params)).status).toBe(404);
    expect(m.sign).not.toHaveBeenCalled();
  });
  it("allows a current moderator to review pending content", async () => {
    m.document.mockResolvedValue({ fileUrl: "uploadthing-private:abc123", status: "pending", visibility: "public" });
    m.auth.mockResolvedValue({ user: { id } }); m.actor.mockResolvedValue({ role: "moderator" });
    expect((await GET(request(), params)).status).toBe(206);
  });
  it("rejects legacy URLs, missing documents, bad ids and invalid range requests", async () => {
    m.document.mockResolvedValueOnce({ fileUrl: "http://127.0.0.1/private", status: "approved", visibility: "public" }).mockResolvedValueOnce(null);
    expect((await GET(request(), params)).status).toBe(404);
    expect((await GET(request(), params)).status).toBe(404);
    expect((await GET(request(), { params: Promise.resolve({ id: "bad" }) })).status).toBe(404);
    expect((await GET(request({ range: "bytes=0-1,4-5" }), params)).status).toBe(416);
    expect(m.sign).not.toHaveBeenCalled();
  });
  it("fails closed without exposing signed URLs on provider errors", async () => {
    m.sign.mockRejectedValueOnce(new Error("secret"));
    const res = await GET(request(), params);
    expect(res.status).toBe(503); expect(await res.text()).not.toContain("secret");
  });
});
