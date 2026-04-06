import { Inngest } from "inngest";

// ─────────────────────────────────────────────────────────────────────────────
// INNGEST CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export const inngest = new Inngest({
  id: "getpidief",
  name: "getpidief — Academic Resource Network",
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TYPE DEFINITIONS
// All events are typed here. Workers subscribe to these exact event names.
// ─────────────────────────────────────────────────────────────────────────────

export type InngestEvents = {
  // ── DOCUMENT EVENTS ────────────────────────────────────────────────────────

  "document/uploaded": {
    data: {
      documentId: string;
      authorId: string;
      fileUrl: string;
      fileSize: number;
    };
  };

  "document/approved": {
    data: {
      documentId: string;
      authorId: string;
      moderatorId: string;
    };
  };

  "document/rejected": {
    data: {
      documentId: string;
      authorId: string;
      moderatorId: string;
      reasons: string[];
      note: string | null;
    };
  };

  "document/flagged": {
    data: {
      documentId: string;
      reportedByUserId: string;
      reasons: string[];
    };
  };

  "document/viewed": {
    data: {
      documentId: string;
      userId: string | null;
      sessionId: string;
      ipHash: string;
    };
  };

  "document/downloaded": {
    data: {
      documentId: string;
      userId: string | null;
      ipHash: string;
    };
  };

  "document/liked": {
    data: {
      documentId: string;
      userId: string;
      authorId: string;
      type: "like" | "dislike";
    };
  };

  "document/bookmarked": {
    data: {
      documentId: string;
      userId: string;
    };
  };

  "document/deleted": {
    data: {
      documentId: string;
      fileUrl: string;
      authorId: string;
      deletedByAdminId: string | null;
    };
  };

  "document/shared": {
    data: {
      documentId: string;
      userId: string | null;
      platform: string;
    };
  };

  // ── USER EVENTS ────────────────────────────────────────────────────────────

  "user/registered": {
    data: {
      userId: string;
      email: string;
      name: string;
      provider: "google" | "email";
    };
  };

  "user/onboarding-completed": {
    data: {
      userId: string;
      institutionId: string;
      tagIds: string[];
    };
  };

  "user/followed": {
    data: {
      followerId: string;
      followingId: string;
    };
  };

  "user/unfollowed": {
    data: {
      followerId: string;
      followingId: string;
    };
  };

  "user/suspended": {
    data: {
      userId: string;
      adminId: string;
      reason: string;
      suspendedUntil: string; // ISO date
    };
  };

  "user/deleted": {
    data: {
      userId: string;
      adminId: string | null; // null = self-deletion
    };
  };

  "user/verification-requested": {
    data: {
      userId: string;
      documentUrl: string;
    };
  };

  "user/streak-update": {
    data: {
      userId: string;
    };
  };

  // ── COMMENT EVENTS ─────────────────────────────────────────────────────────

  "comment/posted": {
    data: {
      commentId: string;
      documentId: string;
      authorId: string;
      documentAuthorId: string;
      parentId: string | null;
      parentAuthorId: string | null;
      mentionedUserIds: string[];
      excerpt: string; // first 100 chars
    };
  };

  "comment/helpful-voted": {
    data: {
      commentId: string;
      commentAuthorId: string;
      voterId: string;
    };
  };

  // ── REPUTATION EVENTS ──────────────────────────────────────────────────────

  "reputation/update": {
    data: {
      userId: string;
      eventType: string;
      pointsDelta: number;
      referenceType: string | null;
      referenceId: string | null;
    };
  };

  "reputation/check-badges": {
    data: {
      userId: string;
      triggerType: string; // what triggered the check
    };
  };

  // ── NOTIFICATION EVENTS ────────────────────────────────────────────────────

  "notification/send": {
    data: {
      recipientId: string;
      senderId: string | null;
      type: string;
      entityType: string | null;
      entityId: string | null;
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    };
  };

  // ── EMAIL EVENTS ───────────────────────────────────────────────────────────

  "email/welcome": {
    data: {
      userId: string;
      email: string;
      name: string;
    };
  };

  "email/verification": {
    data: {
      email: string;
      token: string;
      name: string;
    };
  };

  "email/password-reset": {
    data: {
      email: string;
      token: string;
      name: string;
      ipAddress: string;
    };
  };

  "email/document-approved": {
    data: {
      userId: string;
      email: string;
      documentId: string;
      documentTitle: string;
      documentSlug: string;
    };
  };

  "email/document-rejected": {
    data: {
      userId: string;
      email: string;
      documentTitle: string;
      reasons: string[];
      note: string | null;
    };
  };

  "email/weekly-digest": {
    data: {
      userId: string;
      email: string;
    };
  };

  // ── ANALYTICS EVENTS ───────────────────────────────────────────────────────

  "analytics/daily-snapshot": {
    data: {
      date: string; // YYYY-MM-DD
    };
  };

  "analytics/trending-recalculate": {
    data: {
      triggeredBy: "scheduled" | "manual";
    };
  };

  "analytics/flush-counters": {
    data: {
      triggeredBy: "scheduled" | "document-id";
      documentId?: string;
    };
  };

  // ── MODERATION EVENTS ──────────────────────────────────────────────────────

  "moderation/duplicate-check": {
    data: {
      documentId: string;
      fileHash: string;
      authorId: string;
    };
  };

  "moderation/auto-flag-check": {
    data: {
      documentId: string;
    };
  };

  // ── SYSTEM EVENTS ──────────────────────────────────────────────────────────

  "system/cleanup-expired-tokens": {
    data: Record<string, never>;
  };

  "system/cleanup-deleted-files": {
    data: {
      fileUrls: string[];
    };
  };

  "system/rebuild-search-vectors": {
    data: {
      documentIds: string[];
    };
  };
};