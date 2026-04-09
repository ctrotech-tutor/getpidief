import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = {
  notifications: "getpidief <notifications@getpidief.me>",
  digest:        "getpidief <digest@getpidief.me>",
  noreply:       "getpidief <noreply@getpidief.me>",
  auth:          "getpidief <auth@getpidief.me>",
} as const;