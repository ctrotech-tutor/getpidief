import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = {
  notifications: "getpidief <notifications@getpidief.com>",
  digest:        "getpidief <digest@getpidief.com>",
  noreply:       "getpidief <noreply@getpidief.com>",
  auth:          "getpidief <auth@getpidief.com>",
} as const;