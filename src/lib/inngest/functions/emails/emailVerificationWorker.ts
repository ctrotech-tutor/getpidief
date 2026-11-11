import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis, KEYS } from "@/lib/redis/client";
import { nanoid } from "nanoid";
import { getEmailClient, EMAIL_FROM } from "@/lib/email/client";
import { render } from "@react-email/render";
import { VerificationEmail } from "@/components/emails/VerificationEmail";

// ─────────────────────────────────────────────────────────────────────
// WORKER: Send email verification
// ─────────────────────────────────────────────────────────────────────

export const sendEmailVerification = inngest.createFunction(
  {
    id: "send-email-verification",
    name: "Send Email Verification",
    retries: 3,
    triggers: [{ event: "email/send-verification" }],
  },
  async ({ event, step }) => {
    const { userId, name, token: providedToken } = event.data;

    // ── Step 1: Find user ─────────────────────────────────────
    const user = await step.run("find-user", async () => {
      return db.query.authUsers.findFirst({
        where: eq(authUsers.id, userId),
        columns: { id: true, email: true, emailVerified: true, name: true },
      });
    });

    if (!user) {
      console.error("[EmailVerification] User not found:", userId);
      return { skipped: true };
    }

    // ── Step 2: Generate new token if not provided ─────────────────────────────
    const token = await step.run("generate-token", () => typeof providedToken === "string" ? providedToken : nanoid(32));
    const tokenData = JSON.stringify({
      userId: user.id,
      email: user.email,
    });

    // ── Step 3: Store token in Redis ─────────────────────────────────────
    await step.run("store-token", async () => {
      if (!redis) throw new Error("Verification token store is unavailable");
      await redis.setex(KEYS.emailVerifyToken(token), 86400, tokenData);
    });

    // ── Step 4: Send verification email ─────────────────────────────────────
    await step.run("send-email", async () => {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";
      const verificationLink = `${APP_URL}/verify-email?token=${token}`;

      const html = await render(VerificationEmail({
          name,
          token,
          verificationLink,
        }));
      await getEmailClient().send({
        from: EMAIL_FROM.verification,
        to: user.email,
        subject: "Verify your email address — getpidief",
        html,
      });

      console.log("[EmailVerification] Verification email sent to:", user.email);
    });

    return { success: true };
  },
);
