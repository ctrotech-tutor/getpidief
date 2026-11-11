import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { notifications, users, pushSubscriptions, documents, comments, userActivityLog } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { redis, KEYS, incrCounter, invalidateCache } from "@/lib/redis/client";
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
      const [notif] = await db
        .insert(notifications)
        .values({
          recipientId,
          senderId: senderId ?? null,
          type: type as typeof notifications.$inferInsert["type"],
          entityType: (entityType ?? null) as typeof notifications.$inferInsert["entityType"],
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
        if (redis) {
          try {
            await incrCounter(KEYS.unreadNotifCount(recipientId));
          } catch (error) {
            console.warn("[Inngest] Failed to increment unread count:", error);
          }
        }
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

        if (!emailTemplate) return;

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

    return { notifId, delivered: { inapp: true, email: shouldEmail, push: shouldPush } };
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
      const result = await db.execute<{ id: string; email: string }>(
        sql`
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
      eligibleUsers.map((u) => ({
        name: "email/weekly-digest" as const,
        data: { userId: u.id, email: u.email },
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
      
      // Get user info for recipient name
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { displayName: true, username: true }
      });
      
      // Transform data to match interfaces
      const fromFollowed: DigestContributor[] = [];
      const contributorMap = new Map<string, DigestContributor>();
      
      digestData.followedDocs.forEach(doc => {
        const key = doc.author_name;
        if (!contributorMap.has(key)) {
          contributorMap.set(key, {
            displayName: doc.author_name,
            username: doc.author_name.toLowerCase().replace(/\s+/g, ''),
            documents: []
          });
        }
        const contributor = contributorMap.get(key)!;
        contributor.documents.push({
          title: doc.title,
          slug: doc.slug,
          resourceType: 'document',
          authorName: doc.author_name,
          downloadCount: doc.download_count
        });
      });
      
      const trendingAtInstitution: DigestDocument[] = digestData.trendingDocs.map(doc => ({
        title: doc.title,
        slug: doc.slug,
        resourceType: 'document',
        authorName: 'Unknown Author', // trending docs query doesn't include author info
        downloadCount: doc.download_count
      }));
      
      const digestHtml = await render(WeeklyDigestEmail({
          recipientName: userInfo?.displayName || userInfo?.username || "Scholar",
          weekLabel: "This week",
          fromFollowed: Array.from(contributorMap.values()),
          trendingAtInstitution,
        }));
      await getEmailClient().send({
        from: "getpidief <digest@getpidief.me>",
        to: email,
        subject: "Your weekly academic digest 📚",
        html: digestHtml,
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


