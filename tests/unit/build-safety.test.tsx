import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
const mocks = vi.hoisted(() => ({ setApiKey: vi.fn(), send: vi.fn() }));
vi.mock("@sendgrid/mail", () => ({ default: mocks }));
import { getEmailClient } from "@/lib/email/client";
import { POST } from "@/app/api/test-email/route";
import { NetworkStatus } from "@/components/ui/network-status";

describe("build and diagnostics safety", () => {
  it("does not expose a public test-email sender", async () => {
    const result = await POST();
    expect(result.status).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("imports email configuration safely but fails on send when missing", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "sendgrid");
    vi.stubEnv("SENDGRID_API_KEY", "");
    const message = { from: "sender@example.test", to: "recipient@example.test", subject: "Test", html: "test" };
    try {
      expect(() => getEmailClient()).not.toThrow();
      await expect(getEmailClient().send(message)).rejects.toThrow("SENDGRID_API_KEY");
      expect(mocks.setApiKey).not.toHaveBeenCalled();
      vi.stubEnv("SENDGRID_API_KEY", "test-only");
      await getEmailClient().send(message);
      expect(mocks.setApiKey).toHaveBeenCalledWith("test-only");
      expect(mocks.send).toHaveBeenCalledWith(message);
    } finally { vi.unstubAllEnvs(); }
  });
  it("renders network status without reading browser APIs during SSR", () => {
    vi.stubGlobal("navigator", undefined);
    try { expect(() => renderToString(<NetworkStatus />)).not.toThrow(); }
    finally { vi.unstubAllGlobals(); }
  });
});
