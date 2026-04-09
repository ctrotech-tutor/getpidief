import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { apiSuccess, handleApiError } from "@/lib/utils/api";

// Fallback polling endpoint when Pusher WebSocket is unavailable
export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10),
      20
    );

    const recent = await db.query.documents.findMany({
      where: and(
        eq(documents.status, "approved"),
        eq(documents.visibility, "public"),
        isNull(documents.deletedAt)
      ),
      orderBy: [desc(documents.publishedAt)],
      limit,
      with: {
        author: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
        institution: { columns: { id: true, name: true } },
      },
    });

    const items = recent.map((doc) => ({
      type:           "published",
      documentId:     doc.id,
      slug:           doc.slug,
      title:          doc.title,
      thumbnailUrl:   doc.thumbnailUrl,
      authorId:       doc.authorId,
      authorName:     doc.author.displayName,
      authorAvatarUrl:doc.author.avatarUrl,
      institutionId:  doc.institutionId,
      institutionName:(doc as any).institution?.name ?? null,
      publishedAt:    doc.publishedAt,
    }));

    return apiSuccess(
      { items },
      200
    );
  } catch (e) {
    return handleApiError(e);
  }
}