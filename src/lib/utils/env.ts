import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENV SCHEMA  — validated at startup, throws if any required var is missing
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Node ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default("getpidief"),

  // ── Database (Neon) ───────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(), // for migrations

  // ── Auth.js ───────────────────────────────────────────────────────────────
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // ── Google OAuth ──────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // ── Upstash Redis ─────────────────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  UPSTASH_REDIS_RATE_LIMIT_REST_URL: z.string().url(),
  UPSTASH_REDIS_RATE_LIMIT_REST_TOKEN: z.string().min(1),

  // ── Backblaze B2 (S3-compatible) ──────────────────────────────────────────
  B2_KEY_ID: z.string().min(1),
  B2_APPLICATION_KEY: z.string().min(1),
  B2_BUCKET_NAME: z.string().min(1),
  B2_ENDPOINT: z.string().url(),
  B2_PUBLIC_URL: z.string().url().optional(),
  B2_REGION: z.string().min(1).default("us-west-000"),

  // ── Uploadthing ───────────────────────────────────────────────────────────
  UPLOADTHING_SECRET: z.string().min(1),
  UPLOADTHING_APP_ID: z.string().min(1),

  // ── Pusher ────────────────────────────────────────────────────────────────
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1),

  // ── Inngest ───────────────────────────────────────────────────────────────
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),

  // Selected provider validates its credentials at send time.
  EMAIL_PROVIDER: z.enum(["local", "console", "resend", "sendgrid", "gmail", "brevo"]).default("sendgrid"),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),

  // ── Web Push ──────────────────────────────────────────────────────────────
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().email().default("mailto:admin@getpidief.me"),

  // ── PostHog (analytics + feature flags) ──────────────────────────────────
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // ── Sentry ────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

// Validate and export — throws at startup if invalid
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_env.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check .env.local");
}

export const env = _env.data;
export type Env = z.infer<typeof envSchema>;
