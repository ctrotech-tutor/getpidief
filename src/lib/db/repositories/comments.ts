import { db } from "@/lib/db/client";
import { comments } from "@/lib/db/schema";
import { eq, and, isNull, desc, count, sql } from "drizzle-orm";

export const commentsRepository = {
  async getForDocument(documentId: string, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const rows = await db.query.comments.findMany({
      where: and(
        eq(comments.documentId, documentId),
        isNull(comments.parentId),
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
    return { comments: rows, hasMore: rows.length === limit };
  },

  async softDelete(commentId: string, userId: string) {
    await db.update(comments)
      .set({ isDeleted: true, content: "[deleted]", updatedAt: new Date() })
      .where(and(eq(comments.id, commentId), eq(comments.userId, userId)));
  },

  async markHelpful(commentId: string) {
    await db.execute(
      sql`UPDATE comments SET helpful_count = helpful_count + 1 WHERE id = ${commentId}`
    );
  },
};