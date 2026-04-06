import PusherServer from "pusher";
import PusherClient from "pusher-js";

// ─────────────────────────────────────────────────────────────────────────────
// PUSHER SERVER  (used in Server Actions, API routes, Inngest workers)
// ─────────────────────────────────────────────────────────────────────────────

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSHER CLIENT  (singleton for browser — do NOT import in Server Components)
// ─────────────────────────────────────────────────────────────────────────────

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") {
    throw new Error("getPusherClient() called in a server context");
  }

  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",  // for private + presence channels
      auth: {
        headers: { "Content-Type": "application/json" },
      },
    });
  }

  return pusherClientInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL REGISTRY  — single source of truth for all channel names
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNELS = {
  /** Global public channel — Pulse feed, trending, published documents */
  EXPLORE: "public-explore",

  /** Admin presence channel — active admin count, live moderation feed */
  ADMIN: "presence-admin",

  /** Per-user private channel — notifications, upload status, personal events */
  privateUser: (userId: string) => `private-user-${userId}`,

  /** Per-document channel — live comments, like counts, viewer presence */
  privateDocument: (documentId: string) => `private-document-${documentId}`,

  /** Per-document presence channel — tracks who is currently viewing */
  presenceDocument: (documentId: string) => `presence-document-${documentId}`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EVENT REGISTRY  — typed event names for each channel
// ─────────────────────────────────────────────────────────────────────────────

export const EVENTS = {
  // ── EXPLORE channel (public-explore) ─────────────────────────────────────
  /** A new document was approved and published */
  DOCUMENT_PUBLISHED:    "document:published",
  /** A document just entered trending */
  DOCUMENT_TRENDING:     "document:trending",
  /** General pulse activity (uploads, follows, etc.) */
  PULSE_ACTIVITY:        "pulse:activity",

  // ── PRIVATE USER channel ─────────────────────────────────────────────────
  /** In-app notification delivered */
  NOTIFICATION:          "notification:new",
  /** Upload processing status update */
  UPLOAD_STATUS:         "upload:status",
  /** Document preview ready (thumbnail generated) */
  DOCUMENT_PREVIEW_READY:"document:preview-ready",
  /** Follow received */
  FOLLOW_RECEIVED:       "follow:received",

  // ── PRIVATE DOCUMENT channel ─────────────────────────────────────────────
  /** New comment posted on document */
  COMMENT_POSTED:        "comment:new",
  /** Comment deleted */
  COMMENT_DELETED:       "comment:deleted",
  /** Like/dislike count updated */
  REACTION_UPDATED:      "reaction:updated",
  /** View count tick */
  VIEW_COUNT_UPDATED:    "view:updated",

  // ── ADMIN channel ─────────────────────────────────────────────────────────
  /** New document submitted for review */
  MODERATION_NEW_SUBMISSION: "moderation:new-submission",
  /** New report filed */
  MODERATION_NEW_REPORT:     "moderation:new-report",
  /** New user registered */
  ADMIN_NEW_USER:            "admin:new-user",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS for Pusher payloads
// ─────────────────────────────────────────────────────────────────────────────

export type PusherPayloads = {
  [EVENTS.DOCUMENT_PUBLISHED]: {
    documentId: string;
    slug: string;
    title: string;
    authorId: string;
    thumbnailUrl: string | null;
    categoryId: string | null;
    institutionId: string | null;
    publishedAt: string;
  };

  [EVENTS.NOTIFICATION]: {
    id: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  };

  [EVENTS.UPLOAD_STATUS]: {
    documentId: string;
    status: "processing" | "ready" | "failed";
    thumbnailUrl?: string;
    pageCount?: number;
    error?: string;
  };

  [EVENTS.COMMENT_POSTED]: {
    commentId: string;
    documentId: string;
    userId: string;
    username: string;
    avatarUrl: string | null;
    content: string;
    contentHtml: string;
    parentId: string | null;
    createdAt: string;
  };

  [EVENTS.REACTION_UPDATED]: {
    documentId: string;
    likeCount: number;
    dislikeCount: number;
    userReaction: "like" | "dislike" | null;
  };

  [EVENTS.PULSE_ACTIVITY]: {
    type: "upload" | "follow" | "milestone";
    actorId: string;
    actorName: string;
    actorAvatarUrl: string | null;
    institutionId: string | null;
    description: string;
    entityId: string;
    createdAt: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPED TRIGGER HELPER  (server-side — type-checked payloads)
// ─────────────────────────────────────────────────────────────────────────────

export async function triggerPusher<E extends keyof PusherPayloads>(
  channel: string,
  event: E,
  data: PusherPayloads[E]
): Promise<void> {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (err) {
    // Non-fatal — log and continue (Pusher outage should not break core flows)
    console.error("[Pusher] trigger failed", { channel, event, error: err });
  }
}
