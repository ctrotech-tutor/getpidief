import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documentReactions, documents } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { apiSuccess, apiUnauthorized, apiError, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const { id }  = await params;
    const body    = await req.json();
    const type    = body.type as "like" | "dislike";

    if (type !== "like" && type !== "dislike") {
      return apiError("INVALID_PARAMS", "type must be like or dislike");
    }

    const userId = session.user.id;

    // Fetch existing reaction
    const existing = await db.query.documentReactions.findFirst({
      where: and(
        eq(documentReactions.documentId, id),
        eq(documentReactions.userId, userId)
      ),
    });

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      columns: { authorId: true, likeCount: true, dislikeCount: true },
    });

    if (!doc) return apiError("NOT_FOUND", "Document not found", 404);

    let likeCount    = doc.likeCount;
    let dislikeCount = doc.dislikeCount;

    if (!existing) {
      // New reaction
      await db.insert(documentReactions).values({ documentId: id, userId, type });
      if (type === "like")    likeCount    += 1;
      if (type === "dislike") dislikeCount += 1;

      await db.update(documents).set({
        likeCount, dislikeCount, updatedAt: new Date(),
      }).where(eq(documents.id, id));

      if (type === "like") {
        await inngest.send({
          name: "document/liked",
          data: { documentId: id, userId, authorId: doc.authorId, type },
        });
      }
    } else if (existing.type === type) {
      // Toggle off (remove reaction)
      await db.delete(documentReactions).where(
        and(eq(documentReactions.documentId, id), eq(documentReactions.userId, userId))
      );
      if (type === "like")    likeCount    = Math.max(0, likeCount    - 1);
      if (type === "dislike") dislikeCount = Math.max(0, dislikeCount - 1);

      await db.update(documents).set({ likeCount, dislikeCount, updatedAt: new Date() })
        .where(eq(documents.id, id));
    } else {
      // Switch reaction type
      await db.update(documentReactions)
        .set({ type, updatedAt: new Date() })
        .where(and(eq(documentReactions.documentId, id), eq(documentReactions.userId, userId)));

      if (type === "like")    { likeCount += 1; dislikeCount = Math.max(0, dislikeCount - 1); }
      if (type === "dislike") { dislikeCount += 1; likeCount = Math.max(0, likeCount - 1); }

      await db.update(documents).set({ likeCount, dislikeCount, updatedAt: new Date() })
        .where(eq(documents.id, id));
    }

    // Broadcast real-time update to document channel
    await pusherServer.trigger(
      CHANNELS.privateDocument(id),
      EVENTS.REACTION_UPDATED,
      { documentId: id, likeCount, dislikeCount, userReaction: null }
    ).catch(() => {}); // non-fatal

    return apiSuccess({ likeCount, dislikeCount });
  } catch (e) {
    return handleApiError(e);
  }
}