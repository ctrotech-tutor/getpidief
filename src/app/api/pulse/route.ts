import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { sql } from "drizzle-orm";

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

    const publishedItems = recent.map((doc) => ({
      id: `pub-${doc.id}`,
      type:           "published",
      timestamp:      doc.publishedAt ?? doc.createdAt,
      documentId:     doc.id,
      slug:           doc.slug,
      title:          doc.title,
      thumbnailUrl:   doc.thumbnailUrl,
      authorId:       doc.authorId,
      authorName:     doc.author.displayName,
      authorAvatarUrl:doc.author.avatarUrl,
      institutionId:  doc.institutionId,
      institutionName: doc.institution?.name ?? null,
      publishedAt:    (doc.publishedAt ?? doc.createdAt).toISOString(),
    }));

    const activityRows = await db.execute<{
      id: string;
      action: string;
      created_at: string;
      actor_id: string;
      actor_name: string | null;
    }>(sql`
      select
        ual.id::text as id,
        ual.action,
        ual.created_at::text as created_at,
        ual.user_id::text as actor_id,
        u.display_name as actor_name
      from user_activity_log ual
      left join users u on u.id = ual.user_id
      where ual.created_at >= now() - interval '24 hours'
        and ual.action in ('document_uploaded', 'comment_posted', 'follow_created')
      order by ual.created_at desc
      limit ${limit}
    `);

    const activityItems = activityRows.rows.map((row) => ({
      id: `act-${row.id}`,
      type: "activity" as const,
      timestamp: row.created_at,
      activity: {
        type:
          row.action === "follow_created"
            ? "follow"
            : row.action === "comment_posted"
              ? "milestone"
              : "upload",
        actorId: row.actor_id,
        actorName: row.actor_name ?? "Scholar",
        actorAvatarUrl: null,
        institutionId: null,
        description:
          row.action === "follow_created"
            ? "New follow activity"
            : row.action === "comment_posted"
              ? "New discussion activity"
              : "New upload activity",
        entityId: row.id,
        createdAt: row.created_at,
      },
    }));

    const items = [...publishedItems, ...activityItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return apiSuccess(
      { items },
      200
    );
  } catch (e) {
    return handleApiError(e);
  }
}