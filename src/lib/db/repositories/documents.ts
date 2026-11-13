import { db } from "@/lib/db/client";
import {
  documents, documentBookmarks, documentReactions,
  users, institutions, categories, tags,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, isNull, not } from "drizzle-orm";
import { KEYS, invalidateCache, zgetTop } from "@/lib/redis/client";
import { notBlockedByEither } from "@/lib/blocks/visibility";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentWithRelations = typeof documents.$inferSelect & {
  author: Pick<typeof users.$inferSelect, "id" | "username" | "displayName" | "avatarUrl" | "verificationStatus"> & {
    reputationScore?: number;
  };
  institution:
    | (Pick<typeof institutions.$inferSelect, "id" | "name" | "logoUrl"> & {
        slug?: string;
      })
    | null;
  category:
    | (Pick<typeof categories.$inferSelect, "id" | "name" | "color"> & {
        slug?: string;
        icon?: string | null;
      })
    | null;
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
  createdAt: Date;
  status: string;
  trendingScore: number;
  institution: { id: string; name: string; logoUrl: string | null } | null;
  category: { id: string; name: string; color: string } | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; verificationStatus: string };
  tags: Array<{ id: string; name: string; slug: string }>;
  userReaction?: "like" | "dislike" | null;
  isBookmarked?: boolean;
};

// Helper function to transform DocumentWithRelations to DocumentCard
export function transformToDocumentCard(doc: DocumentWithRelations): DocumentCard {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    thumbnailUrl: doc.thumbnailUrl,
    resourceType: doc.resourceType,
    academicYear: doc.academicYear,
    pageCount: doc.pageCount,
    downloadCount: doc.downloadCount,
    likeCount: doc.likeCount,
    commentCount: doc.commentCount,
    viewCount: doc.viewCount,
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    status: doc.status,
    trendingScore: doc.trendingScore,
    institution: doc.institution ? {
      id: doc.institution.id,
      name: doc.institution.name,
      logoUrl: doc.institution.logoUrl,
    } : null,
    category: doc.category ? {
      id: doc.category.id,
      name: doc.category.name,
      color: doc.category.color,
    } : null,
    author: {
      id: doc.author.id,
      username: doc.author.username,
      displayName: doc.author.displayName,
      avatarUrl: doc.author.avatarUrl,
      verificationStatus: doc.author.verificationStatus,
    },
    tags: doc.documentTags.map(dt => dt.tag),
    userReaction: doc.userReaction,
    isBookmarked: doc.isBookmarked,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────

export const documentsRepository = {

  // ── Get single document by slug (with full relations) ─────────────────────

  async getBySlug(
    slug: string,
    requestingUserId?: string
  ): Promise<DocumentWithRelations | null> {
    // Do not use the legacy shared document cache: it may contain private
    // documents or another user's reaction and bookmark state.

    const doc = await withDbRetry(() =>
      db.query.documents.findFirst({
      where: and(
        eq(documents.slug, slug),
        eq(documents.status, "approved"),
        eq(documents.visibility, "public"),
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
    }));

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
      return documentsRepository.getRecent({ limit, categoryId, institutionId, requestingUserId: options.requestingUserId });
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
      sql`exists (select 1 from users u where u.id = ${documents.authorId} and u.status = 'active' and u.deleted_at is null)`,
      notBlockedByEither(options.requestingUserId, sql`${documents.authorId}`),
    ];

    if (categoryId) conditions.push(eq(documents.categoryId, categoryId));
    if (institutionId) conditions.push(eq(documents.institutionId, institutionId));

    const rows = await withDbRetry(() =>
      db.query.documents.findMany({
      where: and(...conditions),
      orderBy: [desc(documents.publishedAt), desc(documents.id)],
      limit,
      with: {
        author: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true },
        },
        institution: { columns: { id: true, name: true, logoUrl: true } },
        category: { columns: { id: true, name: true, color: true } },
        documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
      },
    }));

    return rows.map(toDocumentCard);
  },

  // ── Get recommended documents for a user ─────────────────────────────────

  async getRecommended(
    userId: string,
    limit: number = 12
  ): Promise<DocumentCard[]> {
    // Rank only eligible, unseen public documents; filter before LIMIT so
    // invisible or previously viewed resources cannot crowd out valid results.
    // Do not cache hydrated cards: visibility and block state can change at any time.
    const results = await withDbRetry(() => db.execute<{ id: string }>(sql`
      SELECT d.id
      FROM documents d
      LEFT JOIN document_tags dt_match
        ON dt_match.document_id = d.id
        AND dt_match.tag_id IN (SELECT tag_id FROM user_interests WHERE user_id = ${userId}::uuid)
      WHERE d.status = 'approved' AND d.visibility = 'public' AND d.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM users u WHERE u.id = d.author_id AND u.status = 'active' AND u.deleted_at IS NULL)
        AND ${notBlockedByEither(userId, sql`d.author_id`)}
        AND NOT EXISTS (SELECT 1 FROM document_views v WHERE v.user_id = ${userId}::uuid AND v.document_id = d.id)
      GROUP BY d.id
      ORDER BY (d.trending_score + COUNT(dt_match.tag_id) * 10.0) DESC, d.id ASC
      LIMIT ${limit}
    `));
    // Recheck public and author/block eligibility at hydration time. A concurrent
    // change can shorten this batch; it must not resurrect a hidden resource.
    return documentsRepository.getByIds(results.rows.map(row => row.id), userId);
  },

  // ── Get documents by array of IDs (preserves order) ──────────────────────

  async getByIds(
    ids: string[],
    requestingUserId?: string
  ): Promise<DocumentCard[]> {
    if (ids.length === 0) return [];

    const rows = await withDbRetry(() =>
      db.query.documents.findMany({
      where: and(
        inArray(documents.id, ids),
        eq(documents.status, "approved"),
        eq(documents.visibility, "public"),
        isNull(documents.deletedAt),
        sql`exists (select 1 from users u where u.id = ${documents.authorId} and u.status = 'active' and u.deleted_at is null)`,
        notBlockedByEither(requestingUserId, sql`${documents.authorId}`)
      ),
      with: {
        author: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true },
        },
        institution: { columns: { id: true, name: true, logoUrl: true } },
        category: { columns: { id: true, name: true, color: true } },
        documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
      },
    }));

    // Preserve Redis sorted set order
    const byId = new Map(rows.map(row => [row.id, row]));
    const ordered = ids
      .map((id) => byId.get(id))
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

    const rows = await withDbRetry(() =>
      db.query.documents.findMany({
      where: and(...conditions),
      orderBy: [desc(documents.downloadCount)],
      limit,
      with: {
        author: { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        institution: { columns: { id: true, name: true, logoUrl: true } },
        category: { columns: { id: true, name: true, color: true } },
        documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
      },
    }));

    return rows.map(toDocumentCard);
  },

  // ── Get user's uploaded documents ─────────────────────────────────────────

  async getByAuthor(
    authorId: string,
    options: {
      status?: typeof documents.$inferSelect["status"];
      page?: number;
      limit?: number;
      publicOnly?: boolean;
    } = {}
  ) {
    const { status, page = 1, limit = 20, publicOnly = false } = options;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(documents.authorId, authorId),
      isNull(documents.deletedAt),
    ];
    if (status) conditions.push(eq(documents.status, status));
    if (publicOnly) conditions.push(eq(documents.visibility, "public"));

    const [rows, countResult] = await Promise.all([
      withDbRetry(() => db.query.documents.findMany({
        where: and(...conditions),
        orderBy: [desc(documents.createdAt)],
        limit,
        offset,
        columns: { id: true, slug: true, title: true, description: true, thumbnailUrl: true,
          resourceType: true, academicYear: true, pageCount: true, downloadCount: true,
          likeCount: true, commentCount: true, viewCount: true, publishedAt: true,
          createdAt: true, status: true, trendingScore: true },
        with: {
          author: {
            columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true },
          },
          category: { columns: { id: true, name: true, color: true } },
          institution: { columns: { id: true, name: true, logoUrl: true } },
          documentTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
        },
      })),
      withDbRetry(() => db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(and(...conditions))),
    ]);

    // Transform rows to DocumentCard format
    const transformedDocs = rows.map(row => ({
      ...row,
      author: row.author,
      institution: row.institution ? {
        id: row.institution.id,
        name: row.institution.name,
        logoUrl: row.institution.logoUrl || null,
      } : null,
      category: row.category ? {
        id: row.category.id,
        name: row.category.name,
        color: row.category.color,
      } : null,
      tags: row.documentTags?.map(dt => dt.tag) || [],
      status: row.status,
      createdAt: row.createdAt,
    })) as DocumentCard[];

    return {
      documents: transformedDocs,
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

function toDocumentCard(row: DocumentWithRelations): DocumentCard {
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
    createdAt: row.createdAt,
    status: row.status,
    trendingScore: row.trendingScore,
    institution: row.institution ?? null,
    category: row.category ?? null,
    author: row.author,
    tags: (row.documentTags ?? []).map((dt) => dt.tag),
    userReaction: row.userReaction ?? null,
    isBookmarked: row.isBookmarked ?? false,
  };
}

async function withDbRetry<T>(
  operation: () => Promise<T>,
  attempts: number = 3
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const e = error as { message?: string; cause?: { message?: string } | string };
      const message = String(e?.message ?? "");
      const cause = String(
        typeof e?.cause === "string" ? e.cause : (e?.cause?.message ?? "")
      );
      const combined = `${message} ${cause}`.toLowerCase();
      const isTransient =
        combined.includes("fetch failed") ||
        combined.includes("error connecting to database") ||
        combined.includes("econnreset") ||
        combined.includes("etimedout") ||
        combined.includes("econnrefused") ||
        combined.includes("enotfound");
      if (!isTransient || i === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  throw lastError;
}
