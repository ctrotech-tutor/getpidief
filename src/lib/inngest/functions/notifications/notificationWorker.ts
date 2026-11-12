import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { notifications, users, pushSubscriptions, documents, comments, userActivityLog } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { compileWeeklyDigest } from "@/lib/notifications/weekly-digest";
import { insertVisibleNotification, canDeliverNotification } from "@/lib/notifications/delivery";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";
import { getEmailClient } from "@/lib/email/client";
import webpush from "web-push";
import { cron } from "inngest";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { getEmailTemplate } from "./emailTemplates";

// Import email components
import { DocumentApprovedEmail } from "@/components/emails/DocumentApprovedEmail";
import { DocumentRejectedEmail } from "@/components/emails/DocumentRejectedEmail";
import { BadgeEarnedEmail } from "@/components/emails/BadgeEarnedEmail";
import { NewFollowerEmail } from "@/components/emails/NewFollowerEmail";

interface DigestDocument {
  title:        string;
  slug:         string;
  resourceType: string;
  authorName:   string;
  downloadCount:number;
}

interface DigestContributor {
  displayName: string;
  username:    string;
  documents:   DigestDocument[];
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Create and deliver notification
// ─────────────────────────────────────────────────────────────────────────────

export const sendNotification = inngest.createFunction(
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
    triggers: [{ event: "notification/send" }],
  },
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
      return insertVisibleNotification({
        recipientId,
        senderId: senderId ?? null,
        type: type as typeof notifications.$inferInsert["type"],
        entityType: (entityType ?? null) as typeof notifications.$inferInsert["entityType"],
        entityId: entityId ?? null,
        title,
        message,
        metadata: metadata ?? {},
      });
    });
    if (!notifId) return { skipped: true, reason: "Notification unavailable" };

    // ── Step 3: Deliver via Pusher (real-time in-app) ─────────────────────────
    if (prefs[`${typeKey}_inapp`] !== false) {
      await step.run("push-via-pusher", async () => {
        if (!await canDeliverNotification(recipientId, senderId)) return;
        // A signal only: clients fetch the current, filtered count, rather than
        // receiving potentially stale sender content from a queued event.
        await pusherServer.trigger(CHANNELS.privateUser(recipientId), EVENTS.NOTIFICATION, {});
      });
    }

    // ── Step 4: Send email ────────────────────────────────────────────
    const shouldEmail = prefs[`${typeKey}_email`] === true;
    const email = recipient.authUser?.email;

    if (shouldEmail && email) {
      await step.run("send-email", async () => {
        const emailTemplate = await getEmailTemplate(type, {
          name: recipient.authUser?.name ?? "Scholar",
          title,
          message,
          metadata,
        });

        if (!emailTemplate || !await canDeliverNotification(recipientId, senderId)) return;

        await getEmailClient().send({
          from: "getpidief <notifications@getpidief.me>",
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
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
          subs.map(async (sub) => {
            try {
              if (!await canDeliverNotification(recipientId, senderId)) return;
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
            } catch (err: unknown) {
              const error = err as { statusCode?: number };
              // 410 Gone = subscription expired, deactivate it
              if (error.statusCode === 410) {
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

    // Provider delivery can be skipped or fail; preferences are not delivery receipts.
    return { notifId, processed: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Handle new follow (notify + reputation + pulse)
// ─────────────────────────────────────────────────────────────────────────────

export const handleUserFollowed = inngest.createFunction(
  {
    id: "handle-user-followed",
    name: "Handle User Followed",
    retries: 2,
    triggers: [{ event: "user/followed" }],
  },
  async ({ event, step }) => {
    const { followerId, followingId } = event.data;

    const [follower, following] = await Promise.all([
      step.run("fetch-follower", async () =>
        db.query.users.findFirst({
          where: eq(users.id, followerId),
          columns: { id: true, username: true, displayName: true, avatarUrl: true },
        })
      ),
      step.run("fetch-following", async () =>
        db.query.users.findFirst({
          where: eq(users.id, followingId),
          columns: { id: true, username: true },
        })
      ),
    ]);

    if (!follower || !following) return { skipped: true };

    await step.sendEvent("notify-followed-user", {
      name: "notification/send",
      data: {
        recipientId: followingId,
        senderId: followerId,
        type: "follow",
        entityType: "user",
        entityId: followerId,
        title: "You have a new follower",
        message: `${follower.displayName ?? follower.username ?? "A scholar"} started following you.`,
        metadata: {
          username: follower.username,
          followerId,
        },
      },
    });

    await step.sendEvent("reputation-follower-gained", {
      name: "reputation/update",
      data: {
        userId: followingId,
        eventType: "follower_gained",
        pointsDelta: 1,
        referenceType: "user",
        referenceId: followerId,
      },
    });

    await step.run("log-follow-activity", async () => {
      await db.insert(userActivityLog).values({
        userId: followerId,
        action: "follow_created",
        entityType: "user",
        entityId: followingId,
        metadata: { followingId },
      });
    });

    await step.run("broadcast-follow-to-pulse", async () => {
      await pusherServer.trigger(CHANNELS.EXPLORE, EVENTS.PULSE_ACTIVITY, {
        type: "follow",
        actorId: followerId,
        actorName: follower.displayName ?? follower.username ?? "Scholar",
        actorAvatarUrl: follower.avatarUrl ?? null,
        institutionId: null,
        description: "Started following a contributor",
        entityId: followingId,
        createdAt: new Date().toISOString(),
      });
    });

    return { followerId, followingId, processed: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Handle comment posted (notify + reputation + pulse)
// ─────────────────────────────────────────────────────────────────────────────

export const handleCommentPosted = inngest.createFunction(
  {
    id: "handle-comment-posted",
    name: "Handle Comment Posted",
    retries: 2,
    triggers: [{ event: "comment/posted" }],
  },
  async ({ event, step }) => {
    const { commentId, documentId, authorId, documentAuthorId, parentAuthorId, excerpt, mentionedUserIds } = event.data;

    const [author, doc] = await Promise.all([
      step.run("fetch-comment-author", async () =>
        db.query.users.findFirst({
          where: eq(users.id, authorId),
          columns: { username: true, displayName: true, avatarUrl: true },
        })
      ),
      step.run("fetch-comment-document", async () =>
        db.query.documents.findFirst({
          where: eq(documents.id, documentId),
          columns: { slug: true, title: true },
        })
      ),
    ]);

    if (!author || !doc) return { skipped: true };

    await step.sendEvent("reputation-comment-author", {
      name: "reputation/update",
      data: {
        userId: authorId,
        eventType: "comment_posted",
        pointsDelta: 1,
        referenceType: "comment",
        referenceId: commentId,
      },
    });

    if (documentAuthorId !== authorId) {
      await step.sendEvent("notify-document-author", {
        name: "notification/send",
        data: {
          recipientId: documentAuthorId,
          senderId: authorId,
          type: "comment",
          entityType: "document",
          entityId: documentId,
          title: "New comment on your document",
          message: `${author.displayName ?? author.username ?? "Someone"} commented on "${doc.title}".`,
          metadata: {
            documentSlug: doc.slug,
            excerpt,
            commentId,
          },
        },
      });
    }

    if (parentAuthorId && parentAuthorId !== authorId && parentAuthorId !== documentAuthorId) {
      await step.sendEvent("notify-reply-target", {
        name: "notification/send",
        data: {
          recipientId: parentAuthorId,
          senderId: authorId,
          type: "comment",
          entityType: "comment",
          entityId: commentId,
          title: "New reply to your comment",
          message: `${author.displayName ?? author.username ?? "Someone"} replied to your comment.`,
          metadata: {
            documentSlug: doc.slug,
            excerpt,
            commentId,
          },
        },
      });
    }

    if (mentionedUserIds.length > 0) {
      await step.sendEvent(
        "notify-mentioned-users",
        mentionedUserIds
          .filter((userId: string) => userId !== authorId)
          .map((userId: string) => ({
            name: "notification/send" as const,
            data: {
              recipientId: userId,
              senderId: authorId,
              type: "comment",
              entityType: "comment",
              entityId: commentId,
              title: "You were mentioned in a comment",
              message: `${author.displayName ?? author.username ?? "Someone"} mentioned you in a discussion.`,
              metadata: {
                documentSlug: doc.slug,
                excerpt,
                commentId,
              },
            },
          }))
      );
    }

    await step.run("log-comment-activity", async () => {
      await db.insert(userActivityLog).values({
        userId: authorId,
        action: "comment_posted",
        entityType: "comment",
        entityId: commentId,
        metadata: { documentId, documentSlug: doc.slug },
      });
    });

    await step.run("broadcast-comment-to-pulse", async () => {
      await pusherServer.trigger(CHANNELS.EXPLORE, EVENTS.PULSE_ACTIVITY, {
        type: "milestone",
        actorId: authorId,
        actorName: author.displayName ?? author.username ?? "Scholar",
        actorAvatarUrl: author.avatarUrl ?? null,
        institutionId: null,
        description: "Started a new discussion",
        entityId: commentId,
        createdAt: new Date().toISOString(),
      });
    });

    return { commentId, processed: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Handle document liked (notify + reputation)
// ─────────────────────────────────────────────────────────────────────────────

export const handleDocumentLiked = inngest.createFunction(
  {
    id: "handle-document-liked",
    name: "Handle Document Liked",
    retries: 2,
    triggers: [{ event: "document/liked" }],
  },
  async ({ event, step }) => {
    const { documentId, userId, authorId, type } = event.data;
    if (type !== "like" || userId === authorId) return { skipped: true };

    const [actor, doc] = await Promise.all([
      step.run("fetch-like-actor", async () =>
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { username: true, displayName: true },
        })
      ),
      step.run("fetch-liked-document", async () =>
        db.query.documents.findFirst({
          where: eq(documents.id, documentId),
          columns: { slug: true, title: true },
        })
      ),
    ]);

    if (!doc) return { skipped: true };

    await step.sendEvent("notify-document-liked", {
      name: "notification/send",
      data: {
        recipientId: authorId,
        senderId: userId,
        type: "like",
        entityType: "document",
        entityId: documentId,
        title: "Someone liked your document",
        message: `${actor?.displayName ?? actor?.username ?? "A scholar"} liked "${doc.title}".`,
        metadata: {
          documentSlug: doc.slug,
          documentTitle: doc.title,
        },
      },
    });

    await step.sendEvent("reputation-liked-received", {
      name: "reputation/update",
      data: {
        userId: authorId,
        eventType: "document_liked_received",
        pointsDelta: 2,
        referenceType: "document",
        referenceId: documentId,
      },
    });

    return { documentId, authorId, processed: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Weekly digest email
// Cron: every Monday at 9:00 AM UTC
// ─────────────────────────────────────────────────────────────────────────────

export const sendWeeklyDigest = inngest.createFunction(
  {
    id: "send-weekly-digest",
    name: "Send Weekly Digest Emails",
    retries: 2,
    concurrency: { limit: 5 }, // process 5 batches in parallel
    triggers: [cron("0 9 * * 1")], // 9 AM every Monday
  },
  async ({ step }) => {
    // ── Step 1: Get users who want weekly digest ──────────────────────────────
    const eligibleUsers = await step.run("get-eligible-users", async () => {
      const result = await db.execute<{ id: string }>(
        sql`
          SELECT u.id
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
      eligibleUsers.map((u) => ({
        name: "email/weekly-digest" as const,
        data: { userId: u.id },
      }))
    );

    return { queued: eligibleUsers.length };
  }
);

export const processWeeklyDigest = inngest.createFunction(
  {
    id: "process-weekly-digest",
    name: "Process Individual Weekly Digest",
    retries: 3,
    concurrency: { limit: 50 },
    triggers: [{ event: "email/weekly-digest" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data;
    const sent = await step.run("send-digest-email", async () => {
      // Inngest memoizes completed steps. Compile inside the delivery step so
      // delayed jobs and retries don't reuse stale blocks, follows or opt-ins.
      const digest = await compileWeeklyDigest(userId);
      if (!digest || (!digest.followed.length && !digest.trending.length)) return false;
      const { WeeklyDigestEmail } = await import("@/components/emails/WeeklyDigestEmail");
      const contributors = new Map<string, DigestContributor>();
      for (const doc of digest.followed) {
        let contributor = contributors.get(doc.author_id);
        if (!contributor) {
          contributor = { displayName: doc.author_name, username: doc.author_username, documents: [] };
          contributors.set(doc.author_id, contributor);
        }
        contributor.documents.push({ title: doc.title, slug: doc.slug, resourceType: doc.resource_type, authorName: doc.author_name, downloadCount: doc.download_count });
      }
      const trendingAtInstitution: DigestDocument[] = digest.trending.map(doc => ({
        title: doc.title, slug: doc.slug, resourceType: doc.resource_type,
        authorName: doc.author_name, downloadCount: doc.download_count,
      }));
      const digestHtml = await render(WeeklyDigestEmail({
        recipientName: digest.recipient.display_name || digest.recipient.username,
        weekLabel: "This week", fromFollowed: Array.from(contributors.values()), trendingAtInstitution,
      }));
      await getEmailClient().send({
        from: "getpidief <digest@getpidief.me>",
        to: digest.recipient.email,
        subject: "Your weekly academic digest 📚",
        html: digestHtml,
      });
      return true;
    });
    return { userId, sent };
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


