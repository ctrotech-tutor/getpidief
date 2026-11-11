import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { sgMail, EMAIL_FROM } from "@/lib/email/client";
import { redis, KEYS, invalidateCache } from "@/lib/redis/client";
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { VerificationEmail } from "@/components/emails/VerificationEmail";
import { PasswordResetEmail } from "@/components/emails/PasswordResetEmail";

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Handle new user registered
// ─────────────────────────────────────────────────────────────────────────────

export const handleUserRegistered = inngest.createFunction(
  {
    id: "handle-user-registered",
    name: "Handle User Registered",
    retries: 3,
    triggers: [{ event: "user/registered" }],
  },
  async ({ event, step }) => {
    const { userId, email, name } = event.data;

    // Send welcome email
    await step.run("send-welcome-email", async () => {
      const html = await render(WelcomeEmail({ name, email }));
      await sgMail.send({
        from:    EMAIL_FROM.auth,
        to:      email,
        subject: "Welcome to getpidief — your scholar profile is ready",
        html,
      });
    });

    // Update institution contributor count
    await step.run("update-institution-stats", async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { institutionId: true },
      });

      if (user?.institutionId) {
        await db.execute(
          sql`UPDATE institutions SET user_count = user_count + 1 WHERE id = ${user.institutionId}`
        );
        if (redis) {
        try {
          await invalidateCache(KEYS.institutionsPopular());
        } catch (error) {
          console.warn("[Inngest] Failed to invalidate institutions popular cache:", error);
        }
      }
      }
    });

    return { userId, emailSent: true };
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Send password reset email
// ─────────────────────────────────────────────────────────────────────────────

export const sendPasswordResetEmail = inngest.createFunction(
  {
    id: "send-password-reset-email",
    name: "Send Password Reset Email",
    retries: 2,
    triggers: [{ event: "email/password-reset" }],
  },
  async ({ event, step }) => {
    const { email, token, name, ipAddress } = event.data;

    await step.run("send-email", async () => {
      const html = await render(PasswordResetEmail({ name, token, ipAddress }));
      await sgMail.send({
        from:    EMAIL_FROM.auth,
        to:      email,
        subject: "Reset your getpidief password",
        html,
      });
    });

    return { email, sent: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Onboarding completed — warm recommendation cache
// ─────────────────────────────────────────────────────────────────────────────

export const handleOnboardingCompleted = inngest.createFunction(
  {
    id: "handle-onboarding-completed",
    name: "Handle Onboarding Completed",
    retries: 2,
    triggers: [{ event: "user/onboarding-completed" }],
  },
  async ({ event, step }) => {
    const { userId, institutionId } = event.data;

    // Invalidate recommendation cache so first visit to /explore gets fresh data
    await step.run("invalidate-recommendation-cache", async () => {
      if (redis) {
        try {
          await invalidateCache(KEYS.recommended(userId));
        } catch (error) {
          console.warn("[Inngest] Failed to invalidate recommendation cache:", error);
        }
      }
    });

    // Update institution stats
    if (institutionId) {
      await step.run("update-institution-contributor-count", async () => {
        await db.execute(
          sql`UPDATE institutions SET contributor_count = contributor_count + 1 WHERE id = ${institutionId}`
        );
        if (redis) {
        try {
          await invalidateCache(KEYS.institution(institutionId));
        } catch (error) {
          console.warn("[Inngest] Failed to invalidate institution cache:", error);
        }
      }
      });
    }

    return { userId, processed: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Soft-delete user data after deactivation grace period
// ─────────────────────────────────────────────────────────────────────────────

export const handleUserDeleted = inngest.createFunction(
  {
    id: "handle-user-deleted",
    name: "Handle User Account Deletion",
    retries: 2,
    triggers: [{ event: "user/deleted" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data;

    await step.sleep("grace-period", "7d"); // 7-day grace period

    await step.run("anonymize-user-content", async () => {
      // Anonymize public content — don't hard-delete to preserve archive integrity
      await db.execute(sql`
        UPDATE documents
        SET title = '[Deleted Document]', description = NULL
        WHERE author_id = ${userId} AND status != 'approved'
      `);

      // Mark user as hard-deleted
      await db
        .update(users)
        .set({ deletedAt: new Date(), status: "deleted" })
        .where(eq(users.id, userId));
    });

    return { userId, anonymized: true };
  }
);
