import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { notifications, users, pushSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redis, KEYS, incrCounter, invalidateCache } from "@/lib/redis/client";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";
import { resend } from "@/lib/email/client";
import webpush from "web-push";

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Create and deliver notification
// ─────────────────────────────────────────────────────────────────────────────

export const sendNotification = (inngest.createFunction as any)(
  {
    id: "send-notification",
    name: "Send Notification",
    retries: 3,
    // Rate limit: max 50 notifications per recipient per minute
    rateLimit: {
      limit: 50,
      period: "1m",
      key: "event.data.recipientId",
    },
  },
  { event: "notification/send" },
  async ({ event, step }) => {
    const {
      recipientId,
      senderId,
      type,
      entityType,
      entityId,
      title,
      message,
      metadata,
    } = event.data;

    // ── Step 1: Fetch recipient preferences ───────────────────────────────────
    const recipient = await step.run("fetch-recipient", async () => {
      return db.query.users.findFirst({
        where: eq(users.id, recipientId),
        columns: {
          id: true,
          notificationPreferences: true,
          status: true,
        },
        with: {
          authUser: { columns: { email: true, name: true } },
        },
      });
    });

    if (!recipient || recipient.status !== "active") return { skipped: true };

    const prefs = (recipient.notificationPreferences ?? {}) as Record<string, boolean>;
    const typeKey = type.replace(/[^a-z_]/g, ""); // normalize type key

    // ── Step 2: Insert in-app notification ────────────────────────────────────
    const notifId = await step.run("insert-notification", async () => {
      const [notif] = await db
        .insert(notifications)
        .values({
          recipientId,
          senderId: senderId ?? null,
          type: type as any,
          entityType: entityType as any ?? null,
          entityId: entityId ?? null,
          title,
          message,
          metadata: metadata ?? {},
        })
        .returning({ id: notifications.id });

      return notif.id;
    });

    // ── Step 3: Deliver via Pusher (real-time in-app) ─────────────────────────
    if (prefs[`${typeKey}_inapp`] !== false) {
      await step.run("push-via-pusher", async () => {
        await pusherServer.trigger(
          CHANNELS.privateUser(recipientId),
          EVENTS.NOTIFICATION,
          {
            id: notifId,
            type,
            title,
            message,
            metadata,
            createdAt: new Date().toISOString(),
          }
        );

        // Increment unread count in Redis
        await incrCounter(KEYS.unreadNotifCount(recipientId));
      });
    }

    // ── Step 4: Send email ────────────────────────────────────────────────────
    const shouldEmail = prefs[`${typeKey}_email`] === true;
    const email = (recipient as any).authUser?.email;

    if (shouldEmail && email) {
      await step.run("send-email", async () => {
        const emailTemplate = getEmailTemplate(type, {
          name: (recipient as any).authUser?.name ?? "Scholar",
          title,
          message,
          metadata,
        });

        if (!emailTemplate) return;

        await resend.emails.send({
          from: "getpidief <notifications@getpidief.com>",
          to: email,
          subject: emailTemplate.subject,
          react: emailTemplate.component,
        });

        await db
          .update(notifications)
          .set({ emailSent: true, emailSentAt: new Date() })
          .where(eq(notifications.id, notifId));
      });
    }

    // ── Step 5: Send push notification ───────────────────────────────────────
    const shouldPush = prefs[`${typeKey}_push`] === true;

    if (shouldPush) {
      await step.run("send-push", async () => {
        const subs = await db
          .select()
          .from(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.userId, recipientId),
              eq(pushSubscriptions.isActive, true)
            )
          );

        if (subs.length === 0) return;

        const payload = JSON.stringify({
          title,
          body: message,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: `${type}-${entityId ?? "system"}`,
          data: { url: getNotificationUrl(type, entityId, metadata) },
        });

        await Promise.allSettled(
          subs.map(async (sub: any) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload
              );

              await db
                .update(notifications)
                .set({ pushSent: true, pushSentAt: new Date() })
                .where(eq(notifications.id, notifId));
            } catch (err: any) {
              // 410 Gone = subscription expired, deactivate it
              if (err.statusCode === 410) {
                await db
                  .update(pushSubscriptions)
                  .set({ isActive: false })
                  .where(eq(pushSubscriptions.endpoint, sub.endpoint));
              }
            }
          })
        );
      });
    }

    return { notifId, delivered: { inapp: true, email: shouldEmail, push: shouldPush } };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Weekly digest email
// Cron: every Monday at 9:00 AM UTC
// ─────────────────────────────────────────────────────────────────────────────

export const sendWeeklyDigest = (inngest.createFunction as any)(
  {
    id: "send-weekly-digest",
    name: "Send Weekly Digest Emails",
    retries: 2,
    concurrency: { limit: 5 }, // process 5 batches in parallel
  },
  { cron: "0 9 * * 1" }, // 9 AM every Monday
  async ({ step }) => {
    // ── Step 1: Get users who want weekly digest ──────────────────────────────
    const eligibleUsers = await step.run("get-eligible-users", async () => {
      const result = await db.execute<{ id: string; email: string }>(
        require("drizzle-orm").sql`
          SELECT u.id, au.email
          FROM users u
          JOIN auth_users au ON au.id = u.id
          WHERE u.status = 'active'
            AND u.deleted_at IS NULL
            AND u.onboarding_complete = true
            AND (u.notification_preferences->>'weekly_digest')::boolean = true
            AND u.last_active_at > NOW() - INTERVAL '30 days'
          LIMIT 10000
        `
      );
      return result.rows;
    });

    // ── Step 2: Fan out — send one email per user ─────────────────────────────
    await step.sendEvent(
      "fan-out-digests",
      eligibleUsers.map((u: any) => ({
        name: "email/weekly-digest" as const,
        data: { userId: u.id, email: u.email },
      }))
    );

    return { queued: eligibleUsers.length };
  }
);

export const processWeeklyDigest = (inngest.createFunction as any)(
  {
    id: "process-weekly-digest",
    name: "Process Individual Weekly Digest",
    retries: 3,
    concurrency: { limit: 50 },
  },
  { event: "email/weekly-digest" },
  async ({ event, step }: any) => {
    const { userId, email } = event.data;
    const { sql } = await import("drizzle-orm");

    const digestData = await step.run("compile-digest", async () => {
      // Get documents from followed contributors in last 7 days
      const followedDocs = await db.execute<{
        id: string;
        title: string;
        slug: string;
        thumbnail_url: string | null;
        author_name: string;
        download_count: number;
      }>(sql`
        SELECT d.id, d.title, d.slug, d.thumbnail_url,
               u.display_name AS author_name, d.download_count
        FROM documents d
        JOIN follows f ON f.following_id = d.author_id
        JOIN users u ON u.id = d.author_id
        WHERE f.follower_id = ${userId}
          AND d.status = 'approved'
          AND d.published_at >= NOW() - INTERVAL '7 days'
        ORDER BY d.download_count DESC
        LIMIT 5
      `);

      // Get trending documents in user's area of interest
      const trendingDocs = await db.execute<{
        id: string;
        title: string;
        slug: string;
        thumbnail_url: string | null;
        download_count: number;
      }>(sql`
        SELECT d.id, d.title, d.slug, d.thumbnail_url, d.download_count
        FROM documents d
        JOIN document_tags dt ON dt.document_id = d.id
        JOIN user_interests ui ON ui.tag_id = dt.tag_id AND ui.user_id = ${userId}
        WHERE d.status = 'approved'
          AND d.published_at >= NOW() - INTERVAL '7 days'
        GROUP BY d.id
        ORDER BY d.download_count DESC
        LIMIT 5
      `);

      return {
        followedDocs: followedDocs.rows,
        trendingDocs: trendingDocs.rows,
      };
    });

    // Only send if there's something to show
    if (
      digestData.followedDocs.length === 0 &&
      digestData.trendingDocs.length === 0
    ) {
      return { skipped: true, reason: "No content for digest" };
    }

    await step.run("send-digest-email", async () => {
      const { WeeklyDigestEmail } = await import("@/components/emails/WeeklyDigestEmail");
      await resend.emails.send({
        from: "getpidief <digest@getpidief.com>",
        to: email,
        subject: "Your weekly academic digest 📚",
        react: WeeklyDigestEmail({ ...digestData, userId }),
      });
    });

    return { userId, sent: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getNotificationUrl(
  type: string,
  entityId: string | null,
  metadata: Record<string, unknown>
): string {
  const slug = metadata?.documentSlug as string | undefined;

  switch (type) {
    case "like":
    case "comment":
    case "document_approved":
    case "document_rejected":
    case "new_upload_from_following":
      return slug ? `/d/${slug}` : "/dashboard/uploads";
    case "follow":
      return `/u/${metadata?.username ?? ""}`;
    case "badge_earned":
    case "reputation_milestone":
      return "/dashboard";
    default:
      return "/notifications";
  }
}

function getEmailTemplate(
  type: string,
  data: { name: string; title: string; message: string; metadata: Record<string, unknown> }
): { subject: string; component: any } | null {
  // Email templates are React Email components
  // Return null for types that don't have email templates
  switch (type) {
    case "document_approved":
      return {
        subject: `✅ Your document is approved — ${data.metadata.documentTitle}`,
        component: null, // Populated in Phase 6
      };
    case "document_rejected":
      return {
        subject: `Document not approved — action required`,
        component: null,
      };
    case "badge_earned":
      return {
        subject: `🏆 New badge: ${data.metadata.badgeName}`,
        component: null,
      };
    default:
      return null;
  }
}
