import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findDocument: vi.fn(), incr: vi.fn(), insert: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/storage/private-pdf", () => ({ isPrivatePdfReference: (v: string) => v.startsWith("uploadthing-private:") }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { query: { documents: { findFirst: mocks.findDocument } }, insert: mocks.insert } }));
vi.mock("@/lib/redis/client", () => ({ redis: null, KEYS: { downloadCountBuffer: (id: string) => id }, incrCounter: mocks.incr }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
import { GET } from "@/app/api/documents/[id]/download/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.incr.mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  mocks.send.mockResolvedValue(undefined);
});
const req = () => new NextRequest("http://localhost/api/documents/test/download");
const params = { params: Promise.resolve({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) };

describe("document download", () => {
  it("does not redirect to the file or track disabled downloads", async () => {
    mocks.findDocument.mockResolvedValue({ status: "approved", allowDownload: false, fileUrl: "https://example.com/file.pdf" });
    const response = await GET(req(), params);
    expect(response.headers.get("location")).not.toBe("https://example.com/file.pdf");
    expect(mocks.incr).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("routes private files back through the checked file endpoint", async () => {
    mocks.findDocument.mockResolvedValue({ status: "approved", allowDownload: true, authorId: "author", fileUrl: "uploadthing-private:privatekey" });
    const response = await GET(req(), params);
    expect(response.headers.get("location")).toBe("http://localhost/api/documents/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("tracks and redirects allowed public downloads", async () => {
    mocks.findDocument.mockResolvedValue({ status: "approved", allowDownload: true, authorId: "author", fileUrl: "https://example.com/file.pdf" });
    const response = await GET(req(), params);
    expect(response.headers.get("location")).toBe("https://example.com/file.pdf");
    expect(mocks.incr).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
});
