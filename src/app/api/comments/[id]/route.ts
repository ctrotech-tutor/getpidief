import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { comments, commentHelpfulVotes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from "@/lib/utils/api";
import { sanitizeComment } from "@/lib/utils/sanitize";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id } = await params;
    const body   = await req.json();

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
      columns: { userId: true, isDeleted: true },
    });

    if (!comment || comment.isDeleted) return apiNotFound("Comment");

    // Helpful vote
    if (body.action === "helpful") {
      const existing = await db.query.commentHelpfulVotes.findFirst({
        where: and(eq(commentHelpfulVotes.commentId, id), eq(commentHelpfulVotes.userId, session.user.id)),
      });
      if (existing) return apiSuccess({ already: true });

      await db.insert(commentHelpfulVotes).values({ commentId: id, userId: session.user.id });
      await db.execute(sql`UPDATE comments SET helpful_count = helpful_count + 1 WHERE id = ${id}`);
      return apiSuccess({ voted: true });
    }

    // Edit content
    if (body.content) {
      if (comment.userId !== session.user.id) return apiForbidden();
      const clean = sanitizeComment(body.content);
      const html  = DOMPurify.sanitize(await marked(clean));
      await db.update(comments)
        .set({ content: clean, contentHtml: html, isEdited: true, updatedAt: new Date() })
        .where(eq(comments.id, id));
      return apiSuccess({ updated: true });
    }

    return apiSuccess({});
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id }   = await params;
    const userRole = (session.user as any).role;

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
      columns: { userId: true },
    });
    if (!comment) return apiNotFound("Comment");

    const isOwner = comment.userId === session.user.id;
    const isMod   = ["moderator", "admin", "super_admin"].includes(userRole);
    if (!isOwner && !isMod) return apiForbidden();

    await db.update(comments)
      .set({ isDeleted: true, content: "[deleted]", updatedAt: new Date() })
      .where(eq(comments.id, id));

    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
