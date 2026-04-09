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

  // ── Cloudflare R2 ─────────────────────────────────────────────────────────
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

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

  // ── Resend (email) ────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email().default("noreply@getpidief.me"),

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
