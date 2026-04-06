import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { documents, documentTags, tags } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { redis, KEYS, invalidateCache, zincrby, zaddScore } from "@/lib/redis/client";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";
import { storage } from "@/lib/storage/client";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Process uploaded document
// Triggers on: document/uploaded
// Steps: validate → extract metadata → generate thumbnail → update search vector
//        → notify author → update trending sets
// ─────────────────────────────────────────────────────────────────────────────

export const processUploadedDocument = (inngest.createFunction as any)(
  {
    id: "process-uploaded-document",
    name: "Process Uploaded Document",
    retries: 3,
    // Throttle: max 10 concurrent per author to avoid abuse
    throttle: {
      limit: 10,
      period: "1h",
      key: "event.data.authorId",
    },
  },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    const { documentId, authorId, fileUrl, fileSize } = event.data;

    // ── Step 1: Set status to processing ─────────────────────────────────────
    await step.run("set-processing-status", async () => {
      await db
        .update(documents)
        .set({ previewStatus: "processing" })
        .where(eq(documents.id, documentId));
    });

    // ── Step 2: Extract PDF metadata ─────────────────────────────────────────
    const pdfMetadata = await step.run("extract-pdf-metadata", async () => {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);

      const buffer = await response.arrayBuffer();
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      const pageCount = pdfDoc.getPageCount();
      const info = pdfDoc.getTitle();

      // SHA-256 hash for dedup
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      return { pageCount, title: info, fileHash };
    });

    // ── Step 3: Check for duplicate ──────────────────────────────────────────
    const isDuplicate = await step.run("check-duplicate", async () => {
      if (!pdfMetadata.fileHash) return false;

      const existing = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          sql`${documents.fileHash} = ${pdfMetadata.fileHash} 
              AND ${documents.id} != ${documentId}
              AND ${documents.deletedAt} IS NULL`
        )
        .limit(1);

      return existing.length > 0;
    });

    // ── Step 4: Generate thumbnail ───────────────────────────────────────────
    const thumbnailUrl = await step.run("generate-thumbnail", async () => {
      try {
        // Fetch PDF as buffer
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();

        // Use Cloudflare Workers compatible PDF rendering or Puppeteer
        // In production: call dedicated thumbnail microservice or use Cloudflare Worker
        // For Vercel: use Puppeteer via @sparticuz/chromium
        const thumbnailBuffer = await generatePdfThumbnail(
          Buffer.from(buffer),
          documentId
        );

        // Upload thumbnail to R2
        const thumbnailKey = `thumbnails/${documentId}.webp`;
        const url = await storage.upload(thumbnailKey, thumbnailBuffer, {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        });

        return url;
      } catch (error) {
        console.error("[Thumbnail] Failed to generate:", error);
        return null; // Non-fatal — use fallback placeholder
      }
    });

    // ── Step 5: Update document record ───────────────────────────────────────
    await step.run("update-document-record", async () => {
      await db
        .update(documents)
        .set({
          pageCount: pdfMetadata.pageCount,
          fileHash: pdfMetadata.fileHash,
          thumbnailUrl: thumbnailUrl ?? null,
          previewStatus: thumbnailUrl ? "ready" : "failed",
          previewError: thumbnailUrl
            ? null
            : "Thumbnail generation failed — using placeholder",
          isDuplicate: isDuplicate,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    // ── Step 6: Rebuild search vector ────────────────────────────────────────
    await step.run("rebuild-search-vector", async () => {
      // Fetch doc with tags for vector construction
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: { documentTags: { with: { tag: true } } },
      });

      if (!doc) return;

      const tagNames = doc.documentTags
        .map((dt: any) => dt.tag.name)
        .join(" ");

      // Update with weighted tsvector including tags
      await db.execute(sql`
        UPDATE documents SET search_vector = (
          setweight(to_tsvector('english', coalesce(${doc.title}, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(${doc.description ?? ""}, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(${tagNames}, '')), 'C')
        )
        WHERE id = ${documentId}
      `);
    });

    // ── Step 7: Notify author via Pusher ────────────────────────────────────
    await step.run("notify-author", async () => {
      await pusherServer.trigger(
        CHANNELS.privateUser(authorId),
        EVENTS.DOCUMENT_PREVIEW_READY,
        {
          documentId,
          thumbnailUrl,
          pageCount: pdfMetadata.pageCount,
        }
      );
    });

    return { documentId, pageCount: pdfMetadata.pageCount, thumbnailUrl, isDuplicate };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Handle document approval
// Triggers on: document/approved
// Steps: update record → invalidate cache → update trending sets
//        → notify author → update institution/category counts → reputation update
// ─────────────────────────────────────────────────────────────────────────────

export const handleDocumentApproved = (inngest.createFunction as any)(
  {
    id: "handle-document-approved",
    name: "Handle Document Approved",
    retries: 3,
  },
  { event: "document/approved" },
  async ({ event, step }) => {
    const { documentId, authorId, moderatorId } = event.data;

    // ── Step 1: Fetch document details ───────────────────────────────────────
    const doc = await step.run("fetch-document", async () => {
      return db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: { institution: true, category: true },
      });
    });

    if (!doc) throw new Error(`Document ${documentId} not found`);

    // ── Step 2: Update document status ───────────────────────────────────────
    await step.run("update-status", async () => {
      await db
        .update(documents)
        .set({
          status: "approved",
          publishedAt: new Date(),
          moderatedByAdminId: moderatorId,
          moderatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    // ── Step 3: Invalidate caches ────────────────────────────────────────────
    await step.run("invalidate-caches", async () => {
      await invalidateCache(
        KEYS.document(doc.slug),
        KEYS.trendingGlobal(),
        KEYS.recommended(authorId),
        ...(doc.categoryId ? [KEYS.trendingByCategory(doc.categoryId)] : []),
        ...(doc.institutionId
          ? [KEYS.trendingByInstitution(doc.institutionId)]
          : [])
      );
    });

    // ── Step 4: Add to trending sets ─────────────────────────────────────────
    await step.run("add-to-trending", async () => {
      // Initial score: new documents get a boost
      const initialScore = 50;
      await zaddScore(KEYS.trendingGlobal(), initialScore, documentId);
      if (doc.categoryId) {
        await zaddScore(KEYS.trendingByCategory(doc.categoryId), initialScore, documentId);
      }
      if (doc.institutionId) {
        await zaddScore(
          KEYS.trendingByInstitution(doc.institutionId),
          initialScore,
          documentId
        );
      }
    });

    // ── Step 5: Update denormalized counts ───────────────────────────────────
    await step.run("update-counts", async () => {
      // Author document count
      await db.execute(
        sql`UPDATE users SET document_count = document_count + 1 WHERE id = ${authorId}`
      );
      // Institution document count
      if (doc.institutionId) {
        await db.execute(
          sql`UPDATE institutions SET document_count = document_count + 1 WHERE id = ${doc.institutionId}`
        );
      }
      // Category document count
      if (doc.categoryId) {
        await db.execute(
          sql`UPDATE categories SET document_count = document_count + 1 WHERE id = ${doc.categoryId}`
        );
      }
    });

    // ── Step 6: Trigger reputation event ─────────────────────────────────────
    await step.sendEvent("trigger-reputation", {
      name: "reputation/update",
      data: {
        userId: authorId,
        eventType: "document_approved",
        pointsDelta: 10,
        referenceType: "document",
        referenceId: documentId,
      },
    });

    // ── Step 7: Send notification to author ──────────────────────────────────
    await step.sendEvent("send-notification", {
      name: "notification/send",
      data: {
        recipientId: authorId,
        senderId: null,
        type: "document_approved",
        entityType: "document",
        entityId: documentId,
        title: "Your document was approved! ✅",
        message: `"${doc.title}" is now live in the archive.`,
        metadata: { documentTitle: doc.title, documentSlug: doc.slug },
      },
    });

    // ── Step 8: Notify followers of author ───────────────────────────────────
    await step.run("notify-followers", async () => {
      const { follows } = await import("@/lib/db/schema");
      const followerList = await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(eq(follows.followingId, authorId))
        .limit(500); // max 500 notifications per upload

      if (followerList.length === 0) return;

      // Batch insert notifications (Inngest fan-out pattern)
      await inngest.send(
        followerList.map((f) => ({
          name: "notification/send" as const,
          data: {
            recipientId: f.followerId,
            senderId: authorId,
            type: "new_upload_from_following",
            entityType: "document",
            entityId: documentId,
            title: "New upload from someone you follow",
            message: `New document: "${doc.title}"`,
            metadata: {
              documentTitle: doc.title,
              documentSlug: doc.slug,
              authorId,
            },
          },
        }))
      );
    });

    // ── Step 9: Broadcast to Pulse feed ──────────────────────────────────────
    await step.run("broadcast-to-pulse", async () => {
      await pusherServer.trigger(CHANNELS.EXPLORE, EVENTS.DOCUMENT_PUBLISHED, {
        documentId,
        slug: doc.slug,
        title: doc.title,
        authorId,
        institutionId: doc.institutionId,
        thumbnailUrl: doc.thumbnailUrl,
        categoryId: doc.categoryId,
        publishedAt: new Date().toISOString(),
      });
    });

    return { documentId, status: "approved" };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Handle document rejection
// ─────────────────────────────────────────────────────────────────────────────

export const handleDocumentRejected = (inngest.createFunction as any)(
  {
    id: "handle-document-rejected",
    name: "Handle Document Rejected",
    retries: 3,
  },
  { event: "document/rejected" },
  async ({ event, step }) => {
    const { documentId, authorId, reasons, note } = event.data;

    const doc = await step.run("fetch-doc", async () => {
      return db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    });

    if (!doc) return;

    await step.sendEvent("notify-rejection", {
      name: "notification/send",
      data: {
        recipientId: authorId,
        senderId: null,
        type: "document_rejected",
        entityType: "document",
        entityId: documentId,
        title: "Document not approved",
        message: `"${doc.title}" was not approved. Reasons: ${reasons.join(", ")}.`,
        metadata: { documentTitle: doc.title, reasons, note },
      },
    });

    // Reputation penalty
    await step.sendEvent("reputation-penalty", {
      name: "reputation/update",
      data: {
        userId: authorId,
        eventType: "document_rejected_penalty",
        pointsDelta: -2,
        referenceType: "document",
        referenceId: documentId,
      },
    });

    return { documentId, status: "rejected" };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Recalculate trending scores (runs every 15 minutes via cron)
// Formula: score = views*1 + likes*3 + downloads*5 + comments*2 + recency_bonus
// ─────────────────────────────────────────────────────────────────────────────

export const recalculateTrending = (inngest.createFunction as any)(
  {
    id: "recalculate-trending",
    name: "Recalculate Trending Scores",
    retries: 1,
    concurrency: { limit: 1 }, // Only one instance at a time
  },
  [
    { cron: "*/15 * * * *" },                    // Every 15 minutes
    { event: "analytics/trending-recalculate" }, // Or manual trigger
  ] as any,
  async ({ step }: any) => {
    // Acquire lock to prevent duplicate runs
    const locked = await step.run("acquire-lock", async () => {
      const result = await redis.set(KEYS.trendingLock(), "1", {
        ex: 900,  // 15 min TTL
        nx: true, // Only set if not exists
      });
      return result === "OK";
    });

    if (!locked) {
      return { skipped: true, reason: "Another instance is running" };
    }

    const scored = await step.run("score-documents", async () => {
      // Score based on activity in the last 48 hours (rolling window)
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const result = await db.execute<{
        id: string;
        category_id: string | null;
        institution_id: string | null;
        trending_score: number;
      }>(sql`
        WITH activity AS (
          SELECT
            d.id,
            d.category_id,
            d.institution_id,
            -- Base score from counters
            (d.view_count * 1.0 +
             d.like_count * 3.0 +
             d.download_count * 5.0 +
             d.comment_count * 2.0 +
             d.bookmark_count * 1.5) AS engagement_score,
            -- Recency bonus: exponential decay over 48 hours
            EXTRACT(EPOCH FROM (NOW() - d.published_at)) / 3600.0 AS hours_old
          FROM documents d
          WHERE d.status = 'approved'
            AND d.visibility = 'public'
            AND d.deleted_at IS NULL
            AND d.published_at >= ${cutoff}
        )
        SELECT
          id,
          category_id,
          institution_id,
          ROUND(
            (engagement_score * EXP(-0.1 * LEAST(hours_old, 48.0)))::numeric,
            4
          ) AS trending_score
        FROM activity
        ORDER BY trending_score DESC
        LIMIT 1000
      `);

      return result.rows;
    });

    await step.run("update-redis-sorted-sets", async () => {
      // Clear and rebuild sorted sets
      await redis.del(KEYS.trendingGlobal());

      const pipeline = redis.pipeline();

      for (const doc of scored) {
        pipeline.zadd(KEYS.trendingGlobal(), {
          score: doc.trending_score,
          member: doc.id,
        });

        if (doc.category_id) {
          pipeline.zadd(KEYS.trendingByCategory(doc.category_id), {
            score: doc.trending_score,
            member: doc.id,
          });
        }

        if (doc.institution_id) {
          pipeline.zadd(KEYS.trendingByInstitution(doc.institution_id), {
            score: doc.trending_score,
            member: doc.id,
          });
        }
      }

      await pipeline.exec();
    });

    await step.run("update-db-scores", async () => {
      // Batch update trending_score in DB for persistence
      for (const doc of scored.slice(0, 100)) {
        await db
          .update(documents)
          .set({ trendingScore: doc.trending_score })
          .where(eq(documents.id, doc.id));
      }
    });

    await step.run("release-lock", async () => {
      await redis.del(KEYS.trendingLock());
    });

    return { processed: scored.length };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Flush buffered view/download/like counters to DB
// Runs every 5 minutes — prevents hot-row updates on high-traffic documents
// ─────────────────────────────────────────────────────────────────────────────

export const flushEngagementCounters = (inngest.createFunction as any)(
  {
    id: "flush-engagement-counters",
    name: "Flush Engagement Counters",
    retries: 3,
  },
  [
    { cron: "*/5 * * * *" },
    { event: "analytics/flush-counters" },
  ] as any,
  async ({ step }: any) => {
    const pendingIds = await step.run("get-pending", async () => {
      const members = await redis.smembers(KEYS.pendingCounterFlush());
      return members as string[];
    });

    if (pendingIds.length === 0) return { flushed: 0 };

    await step.run("flush-to-db", async () => {
      for (const documentId of pendingIds) {
        const [views, downloads, likes] = await Promise.all([
          redis.getdel(KEYS.viewCountBuffer(documentId)),
          redis.getdel(KEYS.downloadCountBuffer(documentId)),
          redis.getdel(KEYS.likeCountBuffer(documentId)),
        ]);

        const updates: Record<string, any> = { updatedAt: new Date() };
        if (views) updates.viewCount = sql`view_count + ${Number(views)}`;
        if (downloads) updates.downloadCount = sql`download_count + ${Number(downloads)}`;
        if (likes) updates.likeCount = sql`like_count + ${Number(likes)}`;

        if (Object.keys(updates).length > 1) {
          await db.update(documents).set(updates).where(eq(documents.id, documentId));
        }
      }
    });

    await step.run("clear-pending-set", async () => {
      for (const id of pendingIds) {
        await redis.srem(KEYS.pendingCounterFlush(), id);
      }
    });

    return { flushed: pendingIds.length };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Rebuild search vectors for documents with stale vectors
// ─────────────────────────────────────────────────────────────────────────────

export const rebuildSearchVectors = (inngest.createFunction as any)(
  {
    id: "rebuild-search-vectors",
    name: "Rebuild Document Search Vectors",
    retries: 2,
  },
  { event: "system/rebuild-search-vectors" },
  async ({ event, step }) => {
    const { documentIds } = event.data;

    await step.run("rebuild-vectors", async () => {
      for (const docId of documentIds) {
        const doc = await db.query.documents.findFirst({
          where: eq(documents.id, docId),
          with: { documentTags: { with: { tag: true } } },
        });

        if (!doc) continue;

        const tagNames = doc.documentTags.map((dt: any) => dt.tag.name).join(" ");

        await db.execute(sql`
          UPDATE documents SET search_vector = (
            setweight(to_tsvector('english', coalesce(${doc.title}, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(${doc.description ?? ""}, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(${tagNames}, '')), 'C')
          )
          WHERE id = ${docId}
        `);
      }
    });

    return { rebuilt: documentIds.length };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Thumbnail generation (replace with actual implementation)
// ─────────────────────────────────────────────────────────────────────────────

async function generatePdfThumbnail(
  buffer: Buffer,
  documentId: string
): Promise<Buffer> {
  // In production use @sparticuz/chromium + puppeteer-core on Vercel
  // Or a dedicated microservice on Fly.io
  //
  // Minimal implementation using pdf-lib + sharp would be:
  //   1. Extract first page as SVG
  //   2. Render SVG to PNG with sharp
  //   3. Convert PNG to WebP
  //
  // For now, return a placeholder — real impl in Phase 4
  throw new Error("Thumbnail generation not yet implemented — use placeholder");
}