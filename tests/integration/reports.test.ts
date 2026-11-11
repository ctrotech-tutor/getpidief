import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ auth: vi.fn(), tx: vi.fn(), limit: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db/client", () => ({ withTransaction: m.tx }));
vi.mock("@/lib/redis/client", () => ({ rateLimiters: { report: { limit: m.limit } } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: m.send } }));
import { POST } from "@/app/api/reports/route";
const id = "11111111-1111-4111-8111-111111111111";
const body = { documentId: id, reasons: ["spam"] };
const req = (data: unknown) => new NextRequest("http://localhost/api/reports", { method: "POST", body: JSON.stringify(data) });
function transaction(opts: { actor?: boolean; doc?: boolean; duplicate?: boolean; count?: number } = {}) {
  let n = 0;
  const select = vi.fn(() => ({ from: () => ({ where: () => {
    n++; if (n === 3) return Promise.resolve([{ count: opts.count ?? 1 }]);
    return { for: vi.fn().mockResolvedValue((n === 1 ? opts.actor !== false : opts.doc !== false) ? [{ id }] : []) };
  } }) }));
  const values = vi.fn().mockReturnValue({ onConflictDoNothing: () => ({ returning: vi.fn().mockResolvedValue(opts.duplicate ? [] : [{ id }]) }) });
  const update = vi.fn().mockReturnValue({ set: () => ({ where: vi.fn().mockResolvedValue([]) }) });
  m.tx.mockImplementation((fn) => fn({ select, insert: () => ({ values }), update }));
  return { values, update };
}
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ user: { id } }); m.limit.mockResolvedValue({ success: true }); m.send.mockResolvedValue(undefined); });
describe("reports", () => {
  it("validates authentication, reasons and rate limits", async () => {
    m.auth.mockResolvedValueOnce(null); expect((await POST(req(body))).status).toBe(401);
    expect((await POST(req({ ...body, reasons: [] }))).status).toBe(400);
    m.limit.mockResolvedValueOnce({ success: false }); expect((await POST(req(body))).status).toBe(429);
    expect(m.tx).not.toHaveBeenCalled();
  });
  it("does not insert for unavailable documents or inactive accounts", async () => {
    const tx = transaction({ doc: false }); expect((await POST(req(body))).status).toBe(404); expect(tx.values).not.toHaveBeenCalled();
    const inactive = transaction({ actor: false }); expect((await POST(req(body))).status).toBe(404); expect(inactive.values).not.toHaveBeenCalled();
  });
  it("does not increment the count for a duplicate", async () => {
    const tx = transaction({ duplicate: true }); expect((await POST(req(body))).status).toBe(409); expect(tx.update).not.toHaveBeenCalled();
  });
  it("increments and sends an event at the threshold without leaking reporter details", async () => {
    const tx = transaction({ count: 3 }); const response = await POST(req(body));
    expect(response.status).toBe(201); expect(tx.update).toHaveBeenCalledOnce(); expect(m.send).toHaveBeenCalledOnce();
    expect((await response.json()).data).toEqual({ reportId: id });
  });
  it("keeps successful reports successful when event delivery fails", async () => {
    transaction({ count: 3 }); m.send.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req(body))).status).toBe(201); log.mockRestore();
  });
});
