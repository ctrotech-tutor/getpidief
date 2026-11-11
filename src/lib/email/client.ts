import sgMail from "@sendgrid/mail";
import { Resend } from "resend";
import nodemailer from "nodemailer";

export type EmailMessage = { from: string; to: string; subject: string; html: string };
type EmailProvider = "sendgrid" | "resend" | "gmail" | "brevo" | "local" | "console";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} environment variable is required for the selected email provider`);
  return value;
}
function provider(): EmailProvider {
  // Preserve existing deployments that configured SendGrid before EMAIL_PROVIDER existed.
  const value = (process.env.EMAIL_PROVIDER || "sendgrid").trim().toLowerCase();
  if (!["sendgrid", "resend", "gmail", "brevo", "local", "console"].includes(value)) throw new Error("EMAIL_PROVIDER must be sendgrid, resend, gmail, brevo, local, or console");
  if ((value === "local" || value === "console") && process.env.NODE_ENV !== "development") throw new Error("Local email providers are allowed only in development");
  return value as EmailProvider;
}
function sender(input: string, selected: EmailProvider): string {
  return process.env.EMAIL_FROM?.trim() || (selected === "resend" ? process.env.RESEND_FROM_EMAIL?.trim() : undefined) || (selected === "gmail" ? required("GMAIL_USER") : input);
}
function brevoSender(value: string): { email: string; name?: string } {
  const match = value.match(/^\s*(?:(.*?)\s*<([^<>\s]+)>|([^<>\s]+))\s*$/);
  const email = match?.[2] || match?.[3];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("EMAIL_FROM must contain a valid sender email");
  return { email, ...(match?.[1] ? { name: match[1].replace(/^"|"$/g, "").trim() } : {}) };
}

// The callers await this interface, so provider failures propagate to Inngest retries.
// Selection and validation happen at send time, never at build time.
export function getEmailClient() {
  return { async send(message: EmailMessage): Promise<void> {
    const selected = provider();
    const from = sender(message.from, selected);
    if (selected === "local") {
      // Restrict the unencrypted development SMTP connection to this machine.
      const rawPort = process.env.MAILPIT_SMTP_PORT || "1025";
      if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) throw new Error("MAILPIT_SMTP_PORT must be a valid port");
      const transport = nodemailer.createTransport({ host: "127.0.0.1", port: Number(rawPort), secure: false, ignoreTLS: true, connectionTimeout: 5000 });
      await transport.sendMail({ ...message, from });
      return;
    }
    if (selected === "console") {
      // HTML contains one-time tokens. This provider is opt-in and development-only.
      const links = [...message.html.matchAll(/href=["']([^"']+)["']/g)]
        .map(match => match[1].replaceAll("&amp;", "&"))
        .filter(link => /\/(?:verify-email|reset-password)\?/.test(link));
      console.log("[Local email] To:", message.to, "\nFrom:", from, "\nSubject:", message.subject, "\nAction links:", links.join("\n") || "(none)", "\nHTML:\n", message.html);
      return;
    }
    if (selected === "sendgrid") {
      sgMail.setApiKey(required("SENDGRID_API_KEY"));
      await sgMail.send({ ...message, from });
      return;
    }
    if (selected === "resend") {
      const result = await new Resend(required("RESEND_API_KEY")).emails.send({ ...message, from });
      if (result.error) throw new Error(`Resend failed to accept email (${result.error.name})`);
      return;
    }
    if (selected === "gmail") {
      const user = required("GMAIL_USER");
      const pass = required("GMAIL_APP_PASSWORD");
      const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
      await transport.sendMail({ ...message, from });
      return;
    }
    const apiKey = required("BREVO_API_KEY");
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: brevoSender(from), to: [{ email: message.to }], subject: message.subject, htmlContent: message.html }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Brevo failed to accept email (HTTP ${response.status})`);
  } };
}

// Defaults preserve existing SendGrid installations. EMAIL_FROM overrides all
// categories, useful when a provider verifies one sender or in development.
export const EMAIL_FROM = {
  notifications: "getpidief <notifications@getpidief.me>",
  digest: "getpidief <digest@getpidief.me>",
  noreply: "getpidief <noreply@getpidief.me>",
  auth: "getpidief <auth@getpidief.me>",
  welcome: "getpidief <noreply@getpidief.me>",
  verification: "getpidief <noreply@getpidief.me>",
  password_reset: "getpidief <noreply@getpidief.me>",
} as const;
