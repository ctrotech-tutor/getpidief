import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ sendgridKey: vi.fn(), sendgridSend: vi.fn(), resendInit: vi.fn(), resendSend: vi.fn(), transport: vi.fn(), mail: vi.fn() }));
vi.mock("@sendgrid/mail", () => ({ default: { setApiKey: m.sendgridKey, send: m.sendgridSend } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: m.resendSend }; constructor(key: string) { m.resendInit(key); } } }));
vi.mock("nodemailer", () => ({ default: { createTransport: m.transport } }));
import { getEmailClient } from "@/lib/email/client";
const message = { from: "getpidief <auth@example.test>", to: "learner@example.test", subject: "Verify", html: "<a href='http://localhost:3000/verify-email?token=test'>Verify</a>" };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "development"); m.sendgridSend.mockResolvedValue(undefined); m.resendSend.mockResolvedValue({ data: { id: "id" }, error: null }); m.mail.mockResolvedValue({}); m.transport.mockReturnValue({ sendMail: m.mail }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("configurable email delivery", () => {
  it("defaults to existing SendGrid behavior and honors sender override", async () => {
    vi.stubEnv("EMAIL_PROVIDER", ""); vi.stubEnv("SENDGRID_API_KEY", "test"); vi.stubEnv("EMAIL_FROM", "Team <team@example.test>");
    await getEmailClient().send(message);
    expect(m.sendgridKey).toHaveBeenCalledWith("test"); expect(m.sendgridSend).toHaveBeenCalledWith({ ...message, from: "Team <team@example.test>" });
  });
  it("sends with Resend and propagates API failures", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend"); vi.stubEnv("RESEND_API_KEY", "test"); vi.stubEnv("EMAIL_FROM", "Team <team@example.test>");
    await getEmailClient().send(message);
    expect(m.resendInit).toHaveBeenCalledWith("test"); expect(m.resendSend).toHaveBeenCalledWith({ ...message, from: "Team <team@example.test>" });
    m.resendSend.mockResolvedValueOnce({ data: null, error: { name: "validation_error" } });
    await expect(getEmailClient().send(message)).rejects.toThrow("Resend failed");
  });
  it("uses Gmail app-password SMTP and defaults to the Gmail account as sender", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "gmail"); vi.stubEnv("EMAIL_FROM", ""); vi.stubEnv("GMAIL_USER", "user@gmail.com"); vi.stubEnv("GMAIL_APP_PASSWORD", "app-password");
    await getEmailClient().send(message);
    expect(m.transport).toHaveBeenCalledWith({ service: "gmail", auth: { user: "user@gmail.com", pass: "app-password" } });
    expect(m.mail).toHaveBeenCalledWith({ ...message, from: "user@gmail.com" });
  });
  it("uses the Brevo transactional API and fails on rejection", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "brevo"); vi.stubEnv("BREVO_API_KEY", "test"); vi.stubEnv("EMAIL_FROM", "Learning Team <team@example.test>");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 201 })).mockResolvedValueOnce(new Response("sensitive provider details", { status: 401 })); vi.stubGlobal("fetch", fetchMock);
    await getEmailClient().send(message);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ sender: { name: "Learning Team", email: "team@example.test" }, to: [{ email: message.to }], subject: message.subject, htmlContent: message.html });
    await expect(getEmailClient().send(message)).rejects.toThrow("Brevo failed to accept email (HTTP 401)");
  });
  it("prints the local message only in development and never in production or test", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "local"); const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await getEmailClient().send(message); expect(log).toHaveBeenCalledWith(expect.stringContaining("Local email"), message.to, expect.any(String), expect.any(String), expect.any(String), message.subject, expect.any(String), "http://localhost:3000/verify-email?token=test", expect.any(String), message.html);
    log.mockClear(); vi.stubEnv("NODE_ENV", "production"); await expect(getEmailClient().send(message)).rejects.toThrow("only in development");
    vi.stubEnv("NODE_ENV", "test"); await expect(getEmailClient().send(message)).rejects.toThrow("only in development"); expect(log).not.toHaveBeenCalled();
  });
  it("rejects missing credentials and unknown providers without sending", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend"); vi.stubEnv("RESEND_API_KEY", ""); await expect(getEmailClient().send(message)).rejects.toThrow("RESEND_API_KEY");
    vi.stubEnv("EMAIL_PROVIDER", "invalid"); await expect(getEmailClient().send(message)).rejects.toThrow("EMAIL_PROVIDER");
    expect(m.resendSend).not.toHaveBeenCalled(); expect(m.sendgridSend).not.toHaveBeenCalled();
  });
});
