import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ tx: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ withTransaction: m.tx }));
import { resolveReport, resolveReportInput } from "@/lib/moderation/reports";
const user = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
const input = { documentId, reportId, decision: "dismissed" as const, note: "Not a violation" };
function transaction(opts: { role?: string | null; doc?: boolean; report?: string | null } = {}) {
  let index = 0;
  const actor = opts.role === undefined ? "moderator" : opts.role;
  const status = opts.report === undefined ? "open" : opts.report;
  const rows = [actor ? [{ role: actor }] : [], opts.doc === false ? [] : [{ id: documentId }], status ? [{ status }] : []];
  const locked = vi.fn();
  const select = vi.fn(() => ({ from: () => ({ where: () => ({ for: (mode: string) => { locked(mode); return Promise.resolve(rows[index++]); } }) }) }));
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where });
  const values = vi.fn().mockResolvedValue([]);
  m.tx.mockImplementation((fn) => fn({ select, update: () => ({ set }), insert: () => ({ values }) }));
  return { locked, set, values };
}
beforeEach(() => vi.resetAllMocks());
describe("report resolution", () => {
  it("validates identifiers, decision and a bounded note", () => {
    expect(resolveReportInput.safeParse({ ...input, reportId: "bad" }).success).toBe(false);
    expect(resolveReportInput.safeParse({ ...input, decision: "approve" }).success).toBe(false);
    expect(resolveReportInput.safeParse({ ...input, note: " " }).success).toBe(false);
    expect(resolveReportInput.safeParse({ ...input, note: "x".repeat(501) }).success).toBe(false);
  });
  it("requires an active moderator from the database", async () => {
    const tx = transaction({ role: "student" });
    expect((await resolveReport(user, input)).outcome).toBe("forbidden");
    expect(tx.set).not.toHaveBeenCalled(); expect(tx.values).not.toHaveBeenCalled();
  });
  it("requires both the document and matching report", async () => {
    const tx = transaction({ report: null });
    expect((await resolveReport(user, input)).outcome).toBe("not_found");
    expect(tx.set).not.toHaveBeenCalled();
  });
  it("locks and records the decision and audit together", async () => {
    const tx = transaction();
    expect((await resolveReport(user, input)).outcome).toBe("updated");
    expect(tx.locked).toHaveBeenCalledTimes(3);
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ status: "resolved_dismissed", resolutionNote: input.note, resolvedByAdminId: user }));
    expect(tx.values).toHaveBeenCalledWith(expect.objectContaining({ action: "report_resolved", entityId: reportId, beforeState: { status: "open" } }));
  });
  it("is idempotent for the same decision and rejects competing decisions", async () => {
    const tx = transaction({ report: "resolved_dismissed" });
    expect((await resolveReport(user, input)).outcome).toBe("unchanged");
    expect(tx.set).not.toHaveBeenCalled();
    const other = transaction({ report: "resolved_actioned" });
    expect((await resolveReport(user, input)).outcome).toBe("conflict");
    expect(other.values).not.toHaveBeenCalled();
  });
  it("allows under-review reports and rejects a note empty after sanitizing", async () => {
    transaction({ report: "under_review" });
    expect((await resolveReport(user, { ...input, decision: "actioned" })).outcome).toBe("updated");
    m.tx.mockClear();
    expect((await resolveReport(user, { ...input, note: "\u0001\u0002\u0003" })).outcome).toBe("invalid_note");
    expect(m.tx).not.toHaveBeenCalled();
  });
});
