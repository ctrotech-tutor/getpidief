import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { comments, documents, users } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { createCommentSchema } from "@/lib/validations/schemas";
import { apiSuccess, apiCreated, apiUnauthorized, apiZodError, apiNotFound, apiError, apiRateLimited, handleApiError } from "@/lib/utils/api";
import { rateLimiters } from "@/lib/redis/client";
import { sanitizeComment } from "@/lib/utils/sanitize";
import { inngest } from "@/lib/inngest/client";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const userId = session.user.id;

    // Rate limit: 10 comments per 5 minutes
    const { success } = await rateLimiters.comment.limit(userId);
    if (!success) {
      return apiRateLimited();
    }

    const body   = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { documentId, content, parentId } = parsed.data;

    // Sanitize markdown content
    const cleanContent  = sanitizeComment(content);
    if (!cleanContent.trim()) return apiError("INVALID_PARAMS", "Comment cannot be empty");
    const contentHtml   = DOMPurify.sanitize(await marked(cleanContent));

    // Fetch document for denorm + notification
    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.status, "approved"),
        eq(documents.visibility, "public"), isNull(documents.deletedAt)),
      columns: { authorId: true, title: true, slug: true, commentCount: true },
    });

    if (!doc) return apiNotFound("Document");

    // Find parent comment author for reply notification
    let parentComment = null;
    let rootId: string | null = null;
    if (parentId) {
      parentComment = await db.query.comments.findFirst({
        where: and(eq(comments.id, parentId), eq(comments.documentId, documentId),
          eq(comments.isDeleted, false), isNull(comments.parentId)),
        columns: { userId: true, rootId: true },
      });
      if (!parentComment) return apiNotFound("Comment");
      rootId = parentComment.rootId ?? parentId;
    }

    // A single statement makes the insert and counters atomic and rechecks the
    // document and parent after taking row locks. No schema change is required.
    const mutation = await db.execute<{ id: string; created_at: Date | string }>(sql`
      WITH eligible AS MATERIALIZED (
        SELECT id FROM documents WHERE id = ${documentId} AND status = 'approved'
          AND visibility = 'public' AND deleted_at IS NULL FOR UPDATE
      ), parent AS MATERIALIZED (
        SELECT id FROM comments WHERE id = ${parentId ?? null}::uuid
          AND document_id = ${documentId} AND is_deleted = false AND parent_id IS NULL FOR UPDATE
      ), inserted AS (
        INSERT INTO comments (document_id, user_id, parent_id, root_id, content, content_html)
        SELECT id, ${userId}, ${parentId ?? null}::uuid, ${rootId}::uuid, ${cleanContent}, ${contentHtml}
        FROM eligible WHERE ${parentId ?? null}::uuid IS NULL OR EXISTS (SELECT 1 FROM parent)
        RETURNING id, created_at
      ), document_count AS (
        UPDATE documents SET comment_count = comment_count + 1
        WHERE id IN (SELECT id FROM eligible) AND EXISTS (SELECT 1 FROM inserted) RETURNING id
      ), reply_count AS (
        UPDATE comments SET reply_count = reply_count + 1
        WHERE id IN (SELECT id FROM parent) AND EXISTS (SELECT 1 FROM inserted) RETURNING id
      )
      SELECT id, created_at FROM inserted
    `);
    const comment = mutation.rows[0];
    if (!comment) return apiNotFound(parentId ? "Comment" : "Document");

    // Fetch author info for real-time broadcast
    const author = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { username: true, displayName: true, avatarUrl: true },
    }).catch(() => null);

    // Broadcast to document channel
    await pusherServer.trigger(
      CHANNELS.privateDocument(documentId),
      EVENTS.COMMENT_POSTED,
      {
        commentId:   comment.id,
        documentId,
        userId,
        username:    author?.username ?? "",
        avatarUrl:   author?.avatarUrl ?? null,
        content:     cleanContent,
        contentHtml,
        parentId:    parentId ?? null,
        createdAt:   new Date(comment.created_at).toISOString(),
      }
    ).catch(() => {});

    // Notify document author (not if they commented on their own)
    const excerpt = cleanContent.slice(0, 100);
    await inngest.send({
      name: "comment/posted",
      data: {
        commentId:       comment.id,
        documentId,
        authorId:        userId,
        documentAuthorId:doc.authorId,
        parentId:        parentId ?? null,
        parentAuthorId:  parentComment?.userId ?? null,
        mentionedUserIds:[],
        excerpt,
      },
    }).catch((error) => console.error("Comment notification failed", error));

    return apiCreated({ comment: { id: comment.id, createdAt: comment.created_at } });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("documentId");
    if (!documentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId))
      return apiError("INVALID_PARAMS", "Invalid document ID");

    // Match the public document endpoint. Private access is not yet implemented.
    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.status, "approved"),
        eq(documents.visibility, "public"), isNull(documents.deletedAt)),
      columns: { id: true },
    });
    if (!doc) return apiNotFound("Document");

    const parentId = req.nextUrl.searchParams.get("parentId");
    if (parentId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId))
      return apiError("INVALID_PARAMS", "Invalid parent ID");
    if (parentId) {
      const parent = await db.query.comments.findFirst({
        where: and(eq(comments.id, parentId), eq(comments.documentId, documentId),
          eq(comments.isDeleted, false), isNull(comments.parentId)),
        columns: { id: true },
      });
      if (!parent) return apiNotFound("Comment");
    }
    const pageText = req.nextUrl.searchParams.get("page") ?? "1";
    const limitText = req.nextUrl.searchParams.get("limit") ?? "20";
    if (!/^[1-9]\d*$/.test(pageText) || !/^[1-9]\d*$/.test(limitText))
      return apiError("INVALID_PARAMS", "Invalid pagination");
    const page = Number(pageText);
    const limit = Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit) || (page - 1) * limit > 2147483647)
      return apiError("INVALID_PARAMS", "Invalid pagination");
    const offset = (page - 1) * limit;

    const rows = await db.query.comments.findMany({
      where: and(
        eq(comments.documentId, documentId),
        parentId ? eq(comments.parentId, parentId) : isNull(comments.parentId),
        eq(comments.isDeleted, false)
      ),
      orderBy: [desc(comments.createdAt), desc(comments.id)],
      limit: limit + 1,
      offset,
      columns: { id: true, userId: true, parentId: true, content: true, createdAt: true, isEdited: true, helpfulCount: true, replyCount: true },
      with: {
        user: { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        replies: {
          where: eq(comments.isDeleted, false),
          columns: { id: true, userId: true, parentId: true, content: true, createdAt: true, isEdited: true, helpfulCount: true, replyCount: true },
          orderBy: [desc(comments.createdAt), desc(comments.id)],
          limit: 3,
          with: {
            user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    const response = apiSuccess({ comments: rows.slice(0, limit), page, hasMore: rows.length > limit });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (e) {
    return handleApiError(e);
  }
}