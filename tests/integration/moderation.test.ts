import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ tx: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ withTransaction: mocks.tx }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
import { moderateDocument, moderationInput } from "@/lib/moderation/documents";
const id = "11111111-1111-4111-8111-111111111111";
function setup(role: string | null, status = "pending") {
  let query = 0;
  const select = vi.fn(() => ({ from: () => ({ where: () => ({ for: vi.fn().mockResolvedValue(++query === 1 ? (role ? [{ role }] : []) : [{ status }]) }) }) }));
  const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  const values = vi.fn().mockResolvedValue([]);
  mocks.tx.mockImplementation((fn) => fn({ select, update: () => ({ set }), insert: () => ({ values }) }));
  return { select, set, values };
}
beforeEach(() => { vi.resetAllMocks(); mocks.send.mockResolvedValue(undefined); });
describe("moderation service", () => {
  it("validates UUID, action and rejection reasons", () => {
    expect(moderationInput.safeParse({ documentId: "bad", action: "approve" }).success).toBe(false);
    expect(moderationInput.safeParse({ documentId: id, action: "reject" }).success).toBe(false);
    expect(moderationInput.safeParse({ documentId: id, action: "reject", rejectionReason: "bad" }).success).toBe(false);
  });
  it("does not trust a stale session role and rejects non-moderators", async () => {
    const tx = setup("student");
    expect((await moderateDocument(id, { documentId: id, action: "approve" })).outcome).toBe("forbidden");
    expect(tx.set).not.toHaveBeenCalled(); expect(tx.values).not.toHaveBeenCalled();
  });
  it("updates and audits together, notifying only after the transaction", async () => {
    const tx = setup("moderator");
    expect((await moderateDocument(id, { documentId: id, action: "approve" })).outcome).toBe("updated");
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", moderatedByAdminId: id }));
    expect(tx.values).toHaveBeenCalledWith(expect.objectContaining({ action: "document_approved", beforeState: { status: "pending" } }));
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it("does not repeat an already applied action", async () => {
    const tx = setup("admin", "approved");
    expect((await moderateDocument(id, { documentId: id, action: "approve" })).outcome).toBe("unchanged");
    expect(tx.set).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not make successful moderation appear to fail on delivery errors", async () => {
    setup("admin"); mocks.send.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await moderateDocument(id, { documentId: id, action: "approve" })).outcome).toBe("updated");
    log.mockRestore();
  });
});
