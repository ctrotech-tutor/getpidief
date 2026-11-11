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
          eq(comments.isDeleted, false)),
        columns: { userId: true, rootId: true },
      });
      if (!parentComment) return apiNotFound("Comment");
      rootId = parentComment.rootId ?? parentId;
    }

    // Insert comment
    const [comment] = await db
      .insert(comments)
      .values({
        documentId,
        userId,
        parentId:    parentId ?? null,
        rootId:      rootId ?? null,
        content:     cleanContent,
        contentHtml,
      })
      .returning();

    if (!comment) throw new Error("Failed to create comment");

    // Update document comment count
    await db.execute(
      sql`UPDATE documents SET comment_count = comment_count + 1 WHERE id = ${documentId}`
    );

    // Update parent reply count
    if (parentId) {
      await db.execute(
        sql`UPDATE comments SET reply_count = reply_count + 1 WHERE id = ${parentId}`
      );
    }

    // Fetch author info for real-time broadcast
    const author = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { username: true, displayName: true, avatarUrl: true },
    });

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
        createdAt:   comment.createdAt.toISOString(),
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
    });

    return apiCreated({ comment });
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

    const pageText = req.nextUrl.searchParams.get("page") ?? "1";
    const limitText = req.nextUrl.searchParams.get("limit") ?? "20";
    if (!/^[1-9]\d*$/.test(pageText) || !/^[1-9]\d*$/.test(limitText))
      return apiError("INVALID_PARAMS", "Invalid pagination");
    const page = Number(pageText);
    const limit = Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit))
      return apiError("INVALID_PARAMS", "Invalid pagination");
    const offset = (page - 1) * limit;

    const rows = await db.query.comments.findMany({
      where: and(
        eq(comments.documentId, documentId),
        isNull(comments.parentId),   // top-level only
        eq(comments.isDeleted, false)
      ),
      orderBy: [desc(comments.createdAt)],
      limit,
      offset,
      with: {
        user: { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        replies: {
          where: eq(comments.isDeleted, false),
          orderBy: [desc(comments.createdAt)],
          limit: 3,
          with: {
            user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    return apiSuccess({ comments: rows, page, hasMore: rows.length === limit });
  } catch (e) {
    return handleApiError(e);
  }
}