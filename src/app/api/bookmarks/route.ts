import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { publicBookmarksFor } from "@/lib/db/public-bookmarks";
import { apiSuccess, apiError, apiUnauthorized, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";

const bookmarkSchema = z.object({ documentId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const parsed = bookmarkSchema.safeParse(await req.json());
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid document ID");
    const { documentId } = parsed.data;
    const userId = session.user.id;

    // Lock the document before modifying the bookmark, serializing this action
    // with status changes and other bookmark mutations. A repeated save is a no-op.
    const result = await db.execute<{ eligible: boolean; changed: boolean }>(sql`
      WITH eligible AS MATERIALIZED (
        SELECT id FROM documents WHERE id = ${documentId}
          AND status = 'approved' AND visibility = 'public' AND deleted_at IS NULL
        FOR UPDATE
      ), inserted AS (
        INSERT INTO document_bookmarks (user_id, document_id)
        SELECT ${userId}, id FROM eligible
        ON CONFLICT (user_id, document_id) DO NOTHING RETURNING document_id
      ), updated AS (
        UPDATE documents SET bookmark_count = bookmark_count + 1
        WHERE id IN (SELECT document_id FROM inserted) RETURNING id
      )
      SELECT EXISTS(SELECT 1 FROM eligible) AS eligible,
             EXISTS(SELECT 1 FROM updated) AS changed
    `);
    const outcome = result.rows[0];
    if (!outcome?.eligible) return apiError("NOT_FOUND", "Document not found", 404);
    if (outcome.changed) {
      // The bookmark has already committed. An event outage must not report failure.
      await inngest.send({ name: "document/bookmarked", data: { documentId, userId } }).catch((error) => console.error("Bookmark event failed", error));
    }
    return apiSuccess({ bookmarked: true });
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const parsed = bookmarkSchema.safeParse(await req.json());
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid document ID");
    const { documentId } = parsed.data;
    // Removal remains possible after a resource becomes unavailable.
    await db.execute(sql`
      WITH locked AS MATERIALIZED (SELECT id FROM documents WHERE id = ${documentId} FOR UPDATE),
      removed AS (
        DELETE FROM document_bookmarks WHERE user_id = ${session.user.id}
          AND document_id IN (SELECT id FROM locked) RETURNING document_id
      )
      UPDATE documents SET bookmark_count = GREATEST(0, bookmark_count - 1)
      WHERE id IN (SELECT document_id FROM removed)
    `);
    return apiSuccess({ bookmarked: false });
  } catch (e) { return handleApiError(e); }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const pageText = req.nextUrl.searchParams.get("page") ?? "1";
    const limitText = req.nextUrl.searchParams.get("limit") ?? "20";
    if (!/^[1-9]\d*$/.test(pageText) || !/^[1-9]\d*$/.test(limitText)) return apiError("INVALID_PARAMS", "Invalid pagination");
    const page = Number(pageText), limit = Number(limitText), offset = (page - 1) * limit;
    if (!Number.isSafeInteger(page) || !Number.isSafeInteger(offset) || offset > 2147483647 || limit > 50) return apiError("INVALID_PARAMS", "Invalid pagination");
    const rows = await db.query.documentBookmarks.findMany({
      where: publicBookmarksFor(session.user.id),
      orderBy: (bm, { desc }) => [desc(bm.createdAt), desc(bm.id)],
      limit: limit + 1, offset,
      columns: { id: true, documentId: true, createdAt: true },
      with: { document: {
        columns: { id: true, slug: true, title: true, description: true, thumbnailUrl: true, resourceType: true, pageCount: true, publishedAt: true },
        with: {
          author: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
          institution: { columns: { id: true, name: true, logoUrl: true } },
          category: { columns: { id: true, name: true, color: true } },
        },
      } },
    });
    const response = apiSuccess({ bookmarks: rows.slice(0, limit), page, limit, hasMore: rows.length > limit });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (e) { return handleApiError(e); }
}
