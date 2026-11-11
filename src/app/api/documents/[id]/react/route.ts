import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { withTransaction } from "@/lib/db/client";
import { apiSuccess, apiUnauthorized, apiError, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";

interface Params { params: Promise<{ id: string }> }
type Reaction = "like" | "dislike" | null;
// Explicit state is retry-safe. Legacy `type` remains a toggle for older clients.
const requestSchema = z.union([
  z.object({ reaction: z.enum(["like", "dislike"]).nullable() }).strict(),
  z.object({ type: z.enum(["like", "dislike"]) }).strict(),
]);

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return apiError("INVALID_PARAMS", "Invalid document ID");
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid reaction");
    const userId = session.user.id;
    const request = parsed.data;

    const result = await withTransaction(async (tx) => {
      // Serialize all reaction changes and moderation changes on the document.
      const docs = await tx.execute<{ author_id: string; like_count: number; dislike_count: number }>(sql`
        SELECT author_id, like_count, dislike_count FROM documents
        WHERE id = ${id}::uuid AND status = 'approved' AND visibility = 'public' AND deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM users WHERE id = ${userId}::uuid AND status = 'active' AND deleted_at IS NULL)
        FOR UPDATE
      `);
      const doc = docs.rows[0];
      if (!doc) return null;
      const previous = await tx.execute<{ type: "like" | "dislike" }>(sql`
        SELECT type FROM document_reactions WHERE document_id = ${id}::uuid AND user_id = ${userId}::uuid
      `);
      const old: Reaction = previous.rows[0]?.type ?? null;
      const next: Reaction = "reaction" in request ? request.reaction : old === request.type ? null : request.type;
      if (old !== next) {
        if (next === null) {
          await tx.execute(sql`DELETE FROM document_reactions WHERE document_id = ${id}::uuid AND user_id = ${userId}::uuid`);
        } else {
          await tx.execute(sql`
            INSERT INTO document_reactions (document_id, user_id, type)
            VALUES (${id}::uuid, ${userId}::uuid, ${next}::reaction_type)
            ON CONFLICT (user_id, document_id) DO UPDATE SET type = excluded.type, updated_at = now()
          `);
        }
      }
      const likeCount = Math.max(0, doc.like_count + Number(next === "like") - Number(old === "like"));
      const dislikeCount = Math.max(0, doc.dislike_count + Number(next === "dislike") - Number(old === "dislike"));
      if (old !== next) await tx.execute(sql`
        UPDATE documents SET like_count = ${likeCount}, dislike_count = ${dislikeCount}, updated_at = now() WHERE id = ${id}::uuid
      `);
      return { likeCount, dislikeCount, userReaction: next, changed: old !== next, authorId: doc.author_id };
    });
    if (!result) return apiError("NOT_FOUND", "Document not found", 404);

    if (result.changed) {
      try {
        await pusherServer.trigger(CHANNELS.privateDocument(id), EVENTS.REACTION_UPDATED,
          { documentId: id, likeCount: result.likeCount, dislikeCount: result.dislikeCount });
      } catch { /* The reaction was already saved. */ }
      if (result.userReaction === "like") {
        try {
          await inngest.send({ name: "document/liked", data: { documentId: id, userId, authorId: result.authorId, type: "like" } });
        } catch (error) { console.error("Reaction notification failed", error); }
      }
    }
    const response = apiSuccess({ likeCount: result.likeCount, dislikeCount: result.dislikeCount, userReaction: result.userReaction });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (e) { return handleApiError(e); }
}
