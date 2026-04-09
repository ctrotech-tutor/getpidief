import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documentBookmarks, documents } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { apiSuccess, apiError, apiUnauthorized, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";

const bookmarkSchema = z.object({ documentId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body   = await req.json();
    const parsed = bookmarkSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid document ID");

    const { documentId } = parsed.data;

    await db
      .insert(documentBookmarks)
      .values({ userId: session.user.id, documentId })
      .onConflictDoNothing();

    // Increment bookmark count (buffered via Inngest)
    await db.execute(
      sql`UPDATE documents SET bookmark_count = bookmark_count + 1 WHERE id = ${documentId}`
    );

    await inngest.send({
      name: "document/bookmarked",
      data: { documentId, userId: session.user.id },
    });

    return apiSuccess({ bookmarked: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body   = await req.json();
    const parsed = bookmarkSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid document ID");

    const { documentId } = parsed.data;

    await db.delete(documentBookmarks).where(
      and(
        eq(documentBookmarks.userId, session.user.id),
        eq(documentBookmarks.documentId, documentId)
      )
    );

    await db.execute(
      sql`UPDATE documents SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = ${documentId}`
    );

    return apiSuccess({ bookmarked: false });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const page  = parseInt(req.nextUrl.searchParams.get("page")  ?? "1",  10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
    const offset = (page - 1) * limit;

    const rows = await db.query.documentBookmarks.findMany({
      where: eq(documentBookmarks.userId, session.user.id),
      orderBy: (bm, { desc }) => [desc(bm.createdAt)],
      limit,
      offset,
      with: {
        document: {
          with: {
            author:      { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
            institution: { columns: { id: true, name: true, logoUrl: true } },
            category:    { columns: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return apiSuccess({ bookmarks: rows, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}