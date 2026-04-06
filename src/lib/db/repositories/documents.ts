import { db } from "@/lib/db/client";
import {
  documents, documentTags, documentBookmarks, documentReactions,
  users, institutions, categories, tags,
} from "@/lib/db/schema";
import { eq, and, desc, asc, sql, inArray, isNull, not } from "drizzle-orm";
import { redis, KEYS, TTL, getCache, setCache, invalidateCache, zgetTop } from "@/lib/redis/client";
import type { SearchFilters } from "@/lib/search/search";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentWithRelations = typeof documents.$inferSelect & {
  author: Pick<typeof users.$inferSelect, "id" | "username" | "displayName" | "avatarUrl" | "verificationStatus" | "reputationScore">;
  institution: Pick<typeof institutions.$inferSelect, "id" | "name" | "slug" | "logoUrl"> | null;
  category: Pick<typeof categories.$inferSelect, "id" | "name" | "slug" | "color" | "icon"> | null;
  documentTags: Array<{ tag: Pick<typeof tags.$inferSelect, "id" | "name" | "slug"> }>;
  userReaction?: "like" | "dislike" | null;
  isBookmarked?: boolean;
};

export type DocumentCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  resourceType: string;
  academicYear: number | null;
  pageCount: number | null;
  downloadCount: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  publishedAt: Date | null;
  trendingScore: number;
  institution: { id: string; name: string; logoUrl: string | null } | null;
  category: { id: string; name: string; color: string } | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; verificationStatus: string };
  tags: Array<{ id: string; name: string; slug: string }>;
  userReaction?: "like" | "dislike" | null;
  isBookmarked?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────

export const documentsRepository = {

  // ── Get single document by slug (with full relations) ─────────────────────

  async getBySlug(
    slug: string,
    requestingUserId?: string
  ): Promise<DocumentWithRelations | null> {
    const cacheKey = KEYS.document(slug);
    const cached = await getCache<DocumentWithRelations>(cacheKey);
    if (cached) return cached;

    const doc = await db.query.documents.findFirst({
      where: and(
        eq(documents.slug, slug),
        not(eq(documents.status, "deleted")),
        isNull(documents.deletedAt)
      ),
      with: {
        author: {
          columns: {
            id: true, username: true, displayName: true,
            avatarUrl: true, verificationStatus: true, reputationScore: true,
          },
        },
        institution: {
          columns: { id: true, name: true, slug: true, logoUrl: true },
        },
        category: {
          columns: { id: true, name: true, slug: true, color: true, icon: true },
        },
        documentTags: {
          with: {
            tag: { columns: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!doc) return null;

    // Add per-user data if authenticated
    let userReaction: "like" | "dislike" | null = null;
    let isBookmarked = false;

    if (requestingUserId) {
      const [reaction, bookmark] = await Promise.all([
        db
          .select({ type: documentReactions.type })
          .from(documentReactions)
          .where(
            and(
              eq(documentReactions.documentId, doc.id),
              eq(documentReactions.userId, requestingUserId)
            )
          )
          .limit(1),
        db
          .select({ id: documentBookmarks.id })
          .from(documentBookmarks)
          .where(
            and(
              eq(documentBookmarks.documentId, doc.id),
              eq(documentBookmarks.userId, requestingUserId)
            )
          )
          .limit(1),
      ]);

      userReaction = reaction[0]?.type ?? null;
      isBookmarked = bookmark.length > 0;
    }

    const result = { ...doc, userReaction, isBookmarked } as DocumentWithRelations;

    // Only cache approved public documents
    if (doc.status === "approved" && doc.visibility === "public") {
      await setCache(cacheKey, result, TTL.document);
    }

    return result;
  },

  // ── Get trending documents (Redis sorted set → DB hydration) ──────────────

  async getTrending(
    options: {
      limit?: number;
      categoryId?: string;
      institutionId?: string;
      requestingUserId?: string;
    } = {}
  ): Promise<DocumentCard[]> {
    const { limit = 12, categoryId, institutionId } = options;

    const setKey = categoryId
      ? KEYS.trendingByCategory(categoryId)
      : institutionId
      ? KEYS.trendingByInstitution(institutionId)
      : KEYS.trendingGlobal();

    // Get IDs from Redis sorted set
    const topIds = await zgetTop(setKey, limit);

    if (topIds.length === 0) {
      // Fallback: query DB directly if Redis is empty
      return documentsRepository.getRecent({ limit });
    }

    return documentsRepository.getByIds(topIds, options.requestingUserId);
  },

  // ── Get recent documents ──────────────────────────────────────────────────

  async getRecent(
    options: {
      limit?: number;
      categoryId?: string;
      institutionId?: string;
      requestingUserId?: string;
    } = {}
  ): Promise<DocumentCard[]> {
    const { limit = 12, categoryId, institutionId } = options;

    const conditions = [
      eq(documents.status, "approved"),
      eq(documents.visibility, "public"),
      isNull(documents.deletedAt),
    ];

    if (categoryId) conditions.push(eq(documents.categoryId, categoryId));
    if (institutionId) conditions.push(eq(documents.institutionId, institutionId));

    const rows = await db.query.documents.findMany({
      where: and(...conditions),
      orderBy: [desc(documents.publishedAt)],
      limit,
      with: {
        author: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true },
        },
        institution: { columns: { id: true, name: true, logoUrl: true } },
        category: { columns: { id: true, name: true, color: true } },
        documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
      },
    });

    return rows.map(toDocumentCard);
  },

  // ── Get recommended documents for a user ─────────────────────────────────

  async getRecommended(
    userId: string,
    limit: number = 12
  ): Promise<DocumentCard[]> {
    const cacheKey = KEYS.recommended(userId);
    const cached = await getCache<DocumentCard[]>(cacheKey);
    if (cached) return cached;

    // Query based on user's interest tags + institution
    const results = await db.execute<{
      id: string; slug: string; title: string; description: string | null;
      thumbnail_url: string | null; resource_type: string; academic_year: number | null;
      page_count: number | null; download_count: number; like_count: number;
      comment_count: number; view_count: number; published_at: Date | null;
      trending_score: number;
    }>(sql`
      SELECT DISTINCT ON (d.id)
        d.id, d.slug, d.title, d.description, d.thumbnail_url,
        d.resource_type, d.academic_year, d.page_count, d.download_count,
        d.like_count, d.comment_count, d.view_count, d.published_at,
        d.trending_score,
        -- Relevance score: matching tags get boost
        (d.trending_score * 1.0 + COUNT(dt_match.tag_id) * 10.0) AS relevance
      FROM documents d
      -- Join to find tag overlap with user interests
      LEFT JOIN document_tags dt_match
        ON dt_match.document_id = d.id
        AND dt_match.tag_id IN (
          SELECT tag_id FROM user_interests WHERE user_id = ${userId}
        )
      WHERE d.status = 'approved'
        AND d.visibility = 'public'
        AND d.deleted_at IS NULL
        -- Exclude already viewed
        AND d.id NOT IN (
          SELECT document_id FROM document_views
          WHERE user_id = ${userId}
          LIMIT 200
        )
      GROUP BY d.id
      ORDER BY d.id, relevance DESC
      LIMIT ${limit}
    `);

    if (results.rows.length === 0) {
      return documentsRepository.getTrending({ limit, requestingUserId: userId });
    }

    const ids = results.rows.map((r) => r.id);
    const docs = await documentsRepository.getByIds(ids, userId);

    await setCache(cacheKey, docs, TTL.recommended);
    return docs;
  },

  // ── Get documents by array of IDs (preserves order) ──────────────────────

  async getByIds(
    ids: string[],
    requestingUserId?: string
  ): Promise<DocumentCard[]> {
    if (ids.length === 0) return [];

    const rows = await db.query.documents.findMany({
      where: and(
        inArray(documents.id, ids),
        eq(documents.status, "approved"),
        isNull(documents.deletedAt)
      ),
      with: {
        author: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true },
        },
        institution: { columns: { id: true, name: true, logoUrl: true } },
        category: { columns: { id: true, name: true, color: true } },
        documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
      },
    });

    // Preserve Redis sorted set order
    const ordered = ids
      .map((id) => rows.find((r) => r.id === id))
      .filter(Boolean) as typeof rows;

    return ordered.map(toDocumentCard);
  },

  // ── Get related documents (same category + course code) ───────────────────

  async getRelated(
    documentId: string,
    categoryId: string | null,
    limit: number = 6
  ): Promise<DocumentCard[]> {
    const conditions = [
      eq(documents.status, "approved"),
      eq(documents.visibility, "public"),
      isNull(documents.deletedAt),
      not(eq(documents.id, documentId)),
    ];

    if (categoryId) conditions.push(eq(documents.categoryId, categoryId));

    const rows = await db.query.documents.findMany({
      where: and(...conditions),
      orderBy: [desc(documents.downloadCount)],
      limit,
      with: {
        author: { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        institution: { columns: { id: true, name: true, logoUrl: true } },
        category: { columns: { id: true, name: true, color: true } },
        documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
      },
    });

    return rows.map(toDocumentCard);
  },

  // ── Get user's uploaded documents ─────────────────────────────────────────

  async getByAuthor(
    authorId: string,
    options: {
      status?: typeof documents.$inferSelect["status"];
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(documents.authorId, authorId),
      isNull(documents.deletedAt),
    ];
    if (status) conditions.push(eq(documents.status, status));

    const [rows, countResult] = await Promise.all([
      db.query.documents.findMany({
        where: and(...conditions),
        orderBy: [desc(documents.createdAt)],
        limit,
        offset,
        with: {
          category: { columns: { id: true, name: true, color: true } },
          institution: { columns: { id: true, name: true } },
        },
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(and(...conditions)),
    ]);

    return {
      documents: rows,
      total: countResult[0]?.count ?? 0,
      page,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
    };
  },

  // ── Invalidate all caches for a document ─────────────────────────────────

  async invalidateCache(slug: string, additionalKeys: string[] = []) {
    await invalidateCache(KEYS.document(slug), ...additionalKeys);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAPPER: DB row → DocumentCard
// ─────────────────────────────────────────────────────────────────────────────

function toDocumentCard(row: any): DocumentCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    resourceType: row.resourceType,
    academicYear: row.academicYear,
    pageCount: row.pageCount,
    downloadCount: row.downloadCount,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    viewCount: row.viewCount,
    publishedAt: row.publishedAt,
    trendingScore: row.trendingScore,
    institution: row.institution ?? null,
    category: row.category ?? null,
    author: row.author,
    tags: (row.documentTags ?? []).map((dt: any) => dt.tag),
    userReaction: row.userReaction ?? null,
    isBookmarked: row.isBookmarked ?? false,
  };
}
