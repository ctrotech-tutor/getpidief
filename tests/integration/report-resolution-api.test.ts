import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ auth: vi.fn(), resolve: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/moderation/reports", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/moderation/reports")>()), resolveReport: m.resolve }));
vi.mock("@/lib/db/client", () => ({ withTransaction: vi.fn() }));
import { PATCH } from "@/app/api/admin/reports/[id]/route";
const id = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id }) };
const request = (body: unknown) => new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify(body) });
const body = { documentId: id, decision: "dismissed", note: "No violation" };
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ user: { id } }); });
describe("report resolution API", () => {
  it("requires a session and validated input", async () => {
    m.auth.mockResolvedValueOnce(null);
    expect((await PATCH(request(body), params)).status).toBe(401);
    expect((await PATCH(request({ ...body, documentId: "bad" }), params)).status).toBe(400);
    expect(m.resolve).not.toHaveBeenCalled();
  });
  it("maps service authorization, missing and conflict outcomes", async () => {
    for (const [outcome, status] of [["forbidden", 403], ["not_found", 404], ["conflict", 409]] as const) {
      m.resolve.mockResolvedValueOnce({ outcome });
      expect((await PATCH(request(body), params)).status).toBe(status);
    }
  });
  it("returns an uncached minimal response", async () => {
    m.resolve.mockResolvedValue({ outcome: "updated" });
    const res = await PATCH(request(body), params);
    expect(res.status).toBe(200); expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect((await res.json()).data).toEqual({ reportId: id, changed: true });
  });
});
