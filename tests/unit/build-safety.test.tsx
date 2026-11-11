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
  it("imports email configuration safely but fails at send setup when missing", () => {
    const previous = process.env.SENDGRID_API_KEY;
    try {
      delete process.env.SENDGRID_API_KEY;
      expect(() => getEmailClient()).toThrow("SENDGRID_API_KEY environment variable is not set");
      expect(mocks.setApiKey).not.toHaveBeenCalled();
      process.env.SENDGRID_API_KEY = "test-only";
      expect(getEmailClient()).toBe(mocks);
      expect(mocks.setApiKey).toHaveBeenCalledWith("test-only");
    } finally {
      if (previous === undefined) delete process.env.SENDGRID_API_KEY;
      else process.env.SENDGRID_API_KEY = previous;
    }
  });
  it("renders network status without reading browser APIs during SSR", () => {
    vi.stubGlobal("navigator", undefined);
    try { expect(() => renderToString(<NetworkStatus />)).not.toThrow(); }
    finally { vi.unstubAllGlobals(); }
  });
});
