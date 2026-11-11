import sgMail from "@sendgrid/mail";

// Keep module import safe during builds. Missing configuration fails at send time.
let configured = false;
export function getEmailClient() {
  if (!process.env.SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY environment variable is not set");
  if (!configured) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    configured = true;
  }
  return sgMail;
}

export const EMAIL_FROM = {
  notifications: "getpidief <notifications@getpidief.me>",
  digest:        "getpidief <digest@getpidief.me>",
  noreply:       "getpidief <noreply@getpidief.me>",
  auth:          "getpidief <auth@getpidief.me>",
  welcome:       "getpidief <noreply@getpidief.me>",
  verification:  "getpidief <noreply@getpidief.me>",
  password_reset: "getpidief <noreply@getpidief.me>",
} as const;