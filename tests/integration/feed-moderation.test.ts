import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), select: vi.fn(), update: vi.fn(), insert: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db/client", () => ({ db: { transaction: m.transaction } }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { reviewFeedReport } from "@/app/admin/feed-reports/actions";
import { auditLogs, feedReports, posts, users } from "@/lib/db/schema";
const reportId = "a1b2c3d4-aaaa-4444-aaaa-123456789abc";
const postId = "a1b2c3d4-bbbb-4444-aaaa-123456789abc";
const actorId = "a1b2c3d4-cccc-4444-aaaa-123456789abc";
function form(decision = "removed", note = "Violates policy") { const data = new FormData(); data.set("reportId", reportId); data.set("decision", decision); data.set("note", note); return data; }
beforeEach(() => {
  vi.clearAllMocks(); m.auth.mockResolvedValue({ user: { id: actorId } });
  m.transaction.mockImplementation(fn => fn({ select: m.select, update: m.update, insert: m.insert }));
  m.select.mockImplementation(() => ({ from: (table: unknown) => ({ where: () => {
    const rows = table === users ? [{ role: "moderator" }] : table === feedReports ? [{ postId, replyId: null, status: "open" }] : [{ id: postId }];
    return Object.assign(Promise.resolve(rows), { for: async () => rows });
  } }) }));
  m.update.mockReturnValue({ set: () => ({ where: async () => {} }) });
  m.insert.mockReturnValue({ values: async () => {} });
});
describe("feed report review", () => {
  it("refuses unauthenticated and non-moderator reviews", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expect(reviewFeedReport(form())).rejects.toThrow("sign in");
    m.select.mockImplementation(() => ({ from: () => ({ where: () => ({ for: async () => [{ role: "student" }] }) }) }));
    await expect(reviewFeedReport(form())).rejects.toThrow("Not authorized");
    expect(m.update).not.toHaveBeenCalled();
  });
  it("validates decision and note before writing", async () => {
    await expect(reviewFeedReport(form("other"))).rejects.toThrow("Invalid review");
    await expect(reviewFeedReport(form("removed", "x"))).rejects.toThrow("Invalid review");
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("removes content and records the decision and audit within one transaction", async () => {
    await reviewFeedReport(form());
    expect(m.update.mock.calls.map(call => call[0])).toEqual([posts, feedReports]);
    expect(m.insert).toHaveBeenCalledWith(auditLogs);
    expect(m.revalidate).toHaveBeenCalledWith("/");
  });
  it("dismisses without removing the post", async () => {
    await reviewFeedReport(form("dismissed"));
    expect(m.update.mock.calls.map(call => call[0])).toEqual([feedReports]);
    expect(m.insert).toHaveBeenCalledWith(auditLogs);
  });
});
