import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const profile = vi.fn();
  const institution = vi.fn();
  const send = vi.fn();
  const returning = vi.fn();
  const txWhere = vi.fn(() => ({ returning }));
  const txSet = vi.fn(() => ({ where: txWhere }));
  const txUpdate = vi.fn(() => ({ set: txSet }));
  const txDeleteWhere = vi.fn();
  const txDelete = vi.fn(() => ({ where: txDeleteWhere }));
  const selectWhere = vi.fn();
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  return { where, set, update, profile, institution, send, returning, txWhere, txSet, txUpdate, txDelete, txDeleteWhere, selectWhere, selectFrom };
});
vi.mock("@/lib/db/client", () => ({
  db: { query: { users: { findFirst: m.profile }, institutions: { findFirst: m.institution } }, update: m.update, select: () => ({ from: m.selectFrom }) },
  withTransaction: (fn: (tx: unknown) => unknown) => fn({ update: m.txUpdate, delete: m.txDelete }),
}));
vi.mock("@/lib/redis/client", () => ({ redis: null, KEYS: { onboardingState: () => "state", recommended: () => "recommendations" } }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: m.send } }));
import { saveOnboardingStep1, saveOnboardingStep2, saveOnboardingStep3 } from "@/lib/auth/onboardingActions";

const skip = () => { const f = new FormData(); f.set("skip", "yes"); return f; };
beforeEach(() => { vi.clearAllMocks(); m.profile.mockResolvedValue({ id: "test-user-id" }); m.where.mockResolvedValue(undefined); m.txDeleteWhere.mockResolvedValue(undefined); m.returning.mockResolvedValue([{ institutionId: null }]); m.send.mockResolvedValue({}); });
describe("onboarding progress", () => {
  it("persists skipped institution and academic steps", async () => {
    expect(await saveOnboardingStep1(null, skip())).toMatchObject({ success: true, data: { next: "/onboarding/step-2" } });
    expect(m.set).toHaveBeenCalledWith(expect.objectContaining({ institutionId: null, onboardingStep: expect.anything() }));
    expect(await saveOnboardingStep2(null, skip())).toMatchObject({ success: true, data: { next: "/onboarding/step-3" } });
    expect(m.set).toHaveBeenCalledWith(expect.objectContaining({ onboardingStep: expect.anything() }));
  });
  it("rejects unavailable institutions", async () => {
    m.institution.mockResolvedValue(null);
    const data = new FormData(); data.set("institutionId", "550e8400-e29b-41d4-a716-446655440000");
    expect(await saveOnboardingStep1(null, data)).toMatchObject({ success: false });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("rejects duplicate topic IDs before completing", async () => {
    const data = new FormData(); for (let i = 0; i < 3; i++) data.append("tagIds", "550e8400-e29b-41d4-a716-446655440000");
    expect(await saveOnboardingStep3(null, data)).toMatchObject({ success: false });
    expect(m.txUpdate).not.toHaveBeenCalled();
  });
  it("completes without topics and does not fail if the background service is down", async () => {
    m.send.mockRejectedValueOnce(new Error("unavailable")); const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await saveOnboardingStep3(null, skip())).toMatchObject({ success: true, data: { next: "/" } });
    expect(m.txSet).toHaveBeenCalledWith(expect.objectContaining({ onboardingComplete: true }));
    expect(m.send).toHaveBeenCalledOnce(); warn.mockRestore();
  });
  it("does not send a completion event twice", async () => {
    m.returning.mockResolvedValueOnce([]);
    expect(await saveOnboardingStep3(null, skip())).toMatchObject({ success: true });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.txDelete).not.toHaveBeenCalled();
  });
});
