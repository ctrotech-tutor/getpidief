// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import net from "node:net";
import { getEmailClient } from "@/lib/email/client";

// A small local SMTP fixture checks the real Nodemailer transport without an external service.
describe("development SMTP transport", () => {
  let server: net.Server; let port: number; let received = "";
  beforeAll(async () => {
    server = net.createServer(socket => {
      socket.setEncoding("utf8"); socket.write("220 local.test ESMTP\r\n");
      let buffer = ""; let inData = false;
      socket.on("data", chunk => {
        buffer += chunk;
        while (buffer.includes("\r\n")) {
          const boundary = buffer.indexOf("\r\n"); const line = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          if (inData) {
            if (line === ".") { inData = false; socket.write("250 queued\r\n"); }
            else received += line + "\n";
          } else if (/^EHLO/i.test(line)) socket.write("250-local.test\r\n250 SIZE 10485760\r\n");
          else if (/^HELO|^MAIL FROM|^RCPT TO/i.test(line)) socket.write("250 ok\r\n");
          else if (/^DATA/i.test(line)) { inData = true; socket.write("354 send data\r\n"); }
          else if (/^QUIT/i.test(line)) { socket.write("221 bye\r\n"); socket.end(); }
          else socket.write("250 ok\r\n");
        }
      });
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as net.AddressInfo).port;
  });
  afterAll(async () => { vi.unstubAllEnvs(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  it("sends the actual HTML and verification link over SMTP", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("EMAIL_PROVIDER", "local"); vi.stubEnv("MAILPIT_SMTP_PORT", String(port));
    await getEmailClient().send({ from: "dev@example.test", to: "learner@example.test", subject: "Verify account", html: "<a href=\"http://localhost:3000/verify-email?token=test-token\">Verify</a>" });
    expect(received).toContain("Subject: Verify account");
    expect(received).toContain("http://localhost:3000/verify-email?token=test-token");
  });
});
