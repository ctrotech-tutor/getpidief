import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db, withTransaction } from "@/lib/db/client";
import { comments, commentHelpfulVotes, documents, users } from "@/lib/db/schema";
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, apiError, handleApiError } from "@/lib/utils/api";
import { sanitizeComment } from "@/lib/utils/sanitize";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

interface Params { params: Promise<{ id: string }> }
const patchSchema = z.union([
  z.object({ action: z.literal("helpful") }).strict(),
  z.object({ content: z.string().trim().min(1).max(2000) }).strict(),
]);

async function mutate(id: string, userId: string, action: { type: "vote" } | { type: "edit"; content: string; html: string } | { type: "delete" }) {
  // Lookup supplies only a lock target. All access checks are repeated under locks.
  const target = await db.query.comments.findFirst({ where: eq(comments.id, id), columns: { documentId: true } });
  if (!target) return { outcome: "not_found" as const };
  return withTransaction(async (tx) => {
    const [actor] = await tx.select({ id: users.id }).from(users).where(and(
      eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt),
    )).for("update");
    if (!actor) return { outcome: "not_found" as const };
    const [doc] = await tx.select({ id: documents.id }).from(documents).where(and(
      eq(documents.id, target.documentId), eq(documents.status, "approved"),
      eq(documents.visibility, "public"), isNull(documents.deletedAt),
    )).for("update");
    if (!doc) return { outcome: "not_found" as const };
    const [comment] = await tx.select({ userId: comments.userId, parentId: comments.parentId,
      isDeleted: comments.isDeleted, helpfulCount: comments.helpfulCount }).from(comments).where(and(
      eq(comments.id, id), eq(comments.documentId, doc.id),
    )).for("update");
    if (!comment) return { outcome: "not_found" as const };
    if (action.type !== "vote" && comment.userId !== userId) return { outcome: "forbidden" as const };
    if (comment.isDeleted) return action.type === "delete" ? { outcome: "unchanged" as const } : { outcome: "not_found" as const };
    if (action.type === "vote") {
      const inserted = await tx.insert(commentHelpfulVotes).values({ commentId: id, userId })
        .onConflictDoNothing({ target: [commentHelpfulVotes.userId, commentHelpfulVotes.commentId] }).returning({ id: commentHelpfulVotes.id });
      if (!inserted.length) return { outcome: "already" as const, helpfulCount: comment.helpfulCount };
      const [updated] = await tx.update(comments).set({ helpfulCount: sql`${comments.helpfulCount} + 1` })
        .where(eq(comments.id, id)).returning({ helpfulCount: comments.helpfulCount });
      return { outcome: "voted" as const, helpfulCount: updated.helpfulCount };
    }
    if (action.type === "edit") {
      await tx.update(comments).set({ content: action.content, contentHtml: action.html, isEdited: true, editedAt: new Date(), updatedAt: new Date() }).where(eq(comments.id, id));
      return { outcome: "updated" as const };
    }
    const now = new Date();
    await tx.update(comments).set({ isDeleted: true, deletedAt: now, content: "[deleted]", contentHtml: null, updatedAt: now }).where(eq(comments.id, id));
    await tx.update(documents).set({ commentCount: sql`GREATEST(0, ${documents.commentCount} - 1)` }).where(eq(documents.id, doc.id));
    if (comment.parentId) await tx.update(comments).set({ replyCount: sql`GREATEST(0, ${comments.replyCount} - 1)` }).where(and(eq(comments.id, comment.parentId), eq(comments.documentId, doc.id)));
    return { outcome: "deleted" as const };
  });
}

function responseFor(result: Awaited<ReturnType<typeof mutate>>) {
  if (result.outcome === "not_found") return apiNotFound("Comment");
  if (result.outcome === "forbidden") return apiForbidden();
  const response = apiSuccess(result);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return apiError("INVALID_PARAMS", "Invalid comment ID");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid comment action");
    if ("action" in parsed.data) return responseFor(await mutate(id, session.user.id, { type: "vote" }));
    const clean = sanitizeComment(parsed.data.content).trim();
    if (!clean) return apiError("INVALID_PARAMS", "Comment cannot be empty");
    const html = DOMPurify.sanitize(await marked(clean));
    return responseFor(await mutate(id, session.user.id, { type: "edit", content: clean, html }));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return apiError("INVALID_PARAMS", "Invalid comment ID");
    return responseFor(await mutate(id, session.user.id, { type: "delete" }));
  } catch (error) { return handleApiError(error); }
}
