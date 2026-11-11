import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), tx: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ withTransaction: mocks.tx }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
import { POST } from "@/app/api/documents/route";
const user = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const body = { title: "Example document", uploadId: id, categoryId: id, institutionId: id, resourceType: "other", visibility: "public", fileUrl: "http://127.0.0.1/private", fileSize: 1 };
const request = (data: unknown) => new NextRequest("http://localhost/api/documents", { method: "POST", body: JSON.stringify(data) });
function transaction(receipt: object | null, active = true) {
  const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id, slug: "example" }]) });
  const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
  let selects = 0;
  const select = vi.fn(() => ({ from: () => ({ where: () => ({ for: vi.fn().mockResolvedValue(++selects === 1 ? (active ? [{ id: user }] : []) : (receipt ? [receipt] : [])) }) }) }));
  mocks.tx.mockImplementation((fn) => fn({ select, insert: () => ({ values }), update }));
  return { values, update, select };
}
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: user } }); mocks.send.mockResolvedValue(undefined); });
describe("document submission", () => {
  it("requires authentication and a valid upload receipt rather than a URL", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await POST(request(body))).status).toBe(401);
    expect((await POST(request({ ...body, uploadId: undefined }))).status).toBe(400);
    expect(mocks.tx).not.toHaveBeenCalled();
  });
  it("rejects restricted visibility before attempting a mutation", async () => {
    expect((await POST(request({ ...body, visibility: "private" }))).status).toBe(400);
    expect(mocks.tx).not.toHaveBeenCalled();
  });
  it("rejects unavailable receipts or inactive accounts without inserting", async () => {
    const tx = transaction(null);
    expect((await POST(request(body))).status).toBe(404);
    expect(tx.values).not.toHaveBeenCalled();
    const inactive = transaction({ fileUrl: "https://files.test/a", fileSize: 400 }, false);
    expect((await POST(request(body))).status).toBe(404);
    expect(inactive.values).not.toHaveBeenCalled();
  });
  it("uses server-issued metadata and consumes the receipt within the transaction", async () => {
    const tx = transaction({ fileUrl: "https://files.test/a", fileSize: 400 });
    const response = await POST(request(body));
    expect(response.status).toBe(201);
    expect(tx.values).toHaveBeenCalledWith(expect.objectContaining({ fileUrl: "https://files.test/a", fileSize: 400, authorId: user, status: "pending" }));
    expect(tx.update).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fileUrl: "https://files.test/a", fileSize: 400 }) }));
  });
  it("does not report a saved document as failed when event delivery fails", async () => {
    transaction({ fileUrl: "https://files.test/a", fileSize: 400 });
    mocks.send.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(request(body))).status).toBe(201);
    log.mockRestore();
  });
});
