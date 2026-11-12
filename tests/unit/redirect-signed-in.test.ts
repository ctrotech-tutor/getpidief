import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), redirect: vi.fn((path: string): never => { throw new Error(`redirect:${path}`); }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { query: { users: { findFirst: mocks.find } } } }));
import { redirectSignedInFromAuth } from "@/lib/auth/redirect-signed-in";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
afterEach(() => vi.resetAllMocks());
describe("sign-in and registration redirects", () => {
  it("leaves signed-out and revoked sessions on the auth page", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(redirectSignedInFromAuth()).resolves.toBeUndefined();
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it.each([LoginPage, RegisterPage])("redirects a signed-in active user from either auth page", async page => {
    mocks.auth.mockResolvedValue({ user: { id: "reader" } });
    mocks.find.mockResolvedValue({ status: "active", deletedAt: null, onboardingComplete: true });
    await expect(page()).rejects.toThrow("redirect:/");
  });
  it.each([1, 2, 3, 10, null])("resumes incomplete onboarding from persisted step %s", async step => {
    mocks.auth.mockResolvedValue({ user: { id: "reader" } });
    mocks.find.mockResolvedValue({ status: "active", deletedAt: null, onboardingComplete: false, onboardingStep: step });
    await expect(redirectSignedInFromAuth()).rejects.toThrow(`redirect:/onboarding/step-${step === null ? 1 : Math.min(step, 3)}`);
  });
  it.each([null, { status: "suspended", deletedAt: null }, { status: "active", deletedAt: new Date() }])("does not loop a missing or inactive account", async profile => {
    mocks.auth.mockResolvedValue({ user: { id: "reader" } }); mocks.find.mockResolvedValue(profile);
    await expect(redirectSignedInFromAuth()).resolves.toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
