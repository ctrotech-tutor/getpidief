import { db } from "@/lib/db/client";
import { documents, users, institutions, categories } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { redis, KEYS, TTL, setCache, getCache, zincrby } from "@/lib/redis/client";

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH FILTERS TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type SearchFilters = {
  query: string;
  categoryIds?: string[];
  institutionIds?: string[];
  resourceTypes?: string[];
  yearFrom?: number;
  yearTo?: number;
  verifiedOnly?: boolean;
  language?: string;
  pageCountMin?: number;
  pageCountMax?: number;
  sort?: "relevance" | "recent" | "downloads" | "likes" | "discussed";
  page?: number;
  limit?: number;
  // For institution-scoped search (logged-in user's institution feed)
  institutionScoped?: string;
};

export type SearchResult = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  resourceType: string;
  academicYear: number | null;
  language: string;
  pageCount: number | null;
  downloadCount: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  publishedAt: Date | null;
  institutionId: string | null;
  institutionName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
  headline: string | null;       // FTS highlighted excerpt
  rank: number;                  // ts_rank score
};

type SearchRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  resource_type: string;
  academic_year: number | null;
  language: string;
  page_count: number | null;
  download_count: number;
  like_count: number;
  comment_count: number;
  view_count: number;
  published_at: Date | null;
  institution_id: string | null;
  institution_name: string | null;
  category_id: string | null;
  category_name: string | null;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  author_verified: boolean;
  headline: string | null;
  rank: number;
  total_count: string;
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  queryTimeMs: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEARCH FUNCTION  (PostgreSQL FTS — Phase 1-2, Meilisearch Phase 3+)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchDocuments(
  filters: SearchFilters,
  requestingUserId?: string
): Promise<SearchResponse> {
  const start = Date.now();
  const {
    query,
    categoryIds,
    institutionIds,
    resourceTypes,
    yearFrom,
    yearTo,
    verifiedOnly,
    language,
    pageCountMin,
    pageCountMax,
    sort = "relevance",
    page = 1,
    limit = 25,
    institutionScoped,
  } = filters;

  const offset = (page - 1) * limit;

  // ── Build WHERE clause ────────────────────────────────────────────────────
  const q = query.trim();
  const conditions = [
    sql`d.status = 'approved'`,
    sql`d.deleted_at IS NULL`,
    institutionScoped
      ? sql`(d.visibility = 'public' OR (d.visibility = 'institution' AND d.institution_id = ${institutionScoped}))`
      : sql`d.visibility = 'public'`,
  ];

  if (q) conditions.push(sql`d.search_vector @@ plainto_tsquery('english', ${q})`);
  if (categoryIds?.length) {
    conditions.push(
      sql`d.category_id IN (${sql.join(
        categoryIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )})`
    );
  }
  if (institutionIds?.length) {
    conditions.push(
      sql`d.institution_id IN (${sql.join(
        institutionIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )})`
    );
  }
  if (resourceTypes?.length) {
    conditions.push(
      sql`d.resource_type IN (${sql.join(
        resourceTypes.map((type) => sql`${type}`),
        sql`, `
      )})`
    );
  }
  if (yearFrom) conditions.push(sql`d.academic_year >= ${yearFrom}`);
  if (yearTo) conditions.push(sql`d.academic_year <= ${yearTo}`);
  if (verifiedOnly) conditions.push(sql`u.verification_status = 'verified'`);
  if (language) conditions.push(sql`d.language = ${language}`);
  if (pageCountMin) conditions.push(sql`d.page_count >= ${pageCountMin}`);
  if (pageCountMax) conditions.push(sql`d.page_count <= ${pageCountMax}`);

  const orderMap: Record<NonNullable<SearchFilters["sort"]>, ReturnType<typeof sql>> = {
    relevance: q
      ? sql`ts_rank(d.search_vector, plainto_tsquery('english', ${q})) DESC, d.download_count DESC`
      : sql`d.trending_score DESC`,
    recent: sql`d.published_at DESC`,
    downloads: sql`d.download_count DESC`,
    likes: sql`d.like_count DESC`,
    discussed: sql`d.comment_count DESC`,
  };
  const orderBy = orderMap[sort];
  const headlineAndRank = q
    ? sql`ts_headline(
          'english',
          d.title || ' ' || coalesce(d.description, ''),
          plainto_tsquery('english', ${q}),
          'MaxFragments=1, MaxWords=20, MinWords=10, StartSel=<mark>, StopSel=</mark>'
        ) AS headline,
        ts_rank(d.search_vector, plainto_tsquery('english', ${q})) AS rank`
    : sql`NULL AS headline, d.trending_score AS rank`;

  const searchQuery = sql`
    SELECT
      d.id, d.slug, d.title, d.description, d.thumbnail_url,
      d.resource_type, d.academic_year, d.language, d.page_count,
      d.download_count, d.like_count, d.comment_count, d.view_count,
      d.published_at, d.institution_id, d.category_id,
      i.name AS institution_name,
      c.name AS category_name,
      u.id AS author_id,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar_url,
      (u.verification_status = 'verified') AS author_verified,
      ${headlineAndRank},
      COUNT(*) OVER() AS total_count
    FROM documents d
    LEFT JOIN institutions i ON i.id = d.institution_id
    LEFT JOIN categories c ON c.id = d.category_id
    JOIN users u ON u.id = d.author_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const rows = await db.execute<SearchRow>(
    searchQuery
  );
  const mappedRows: SearchResult[] = rows.rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    thumbnailUrl: r.thumbnail_url,
    resourceType: r.resource_type,
    academicYear: r.academic_year,
    language: r.language,
    pageCount: r.page_count,
    downloadCount: r.download_count,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    viewCount: r.view_count,
    publishedAt: r.published_at,
    institutionId: r.institution_id,
    institutionName: r.institution_name,
    categoryId: r.category_id,
    categoryName: r.category_name,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatarUrl: r.author_avatar_url,
    authorVerified: r.author_verified,
    headline: r.headline,
    rank: r.rank,
  }));

  const total = rows.rows[0] ? parseInt(rows.rows[0].total_count, 10) : 0;
  const totalPages = Math.ceil(total / limit);
  const queryTimeMs = Date.now() - start;

  // ── Log search query for analytics ───────────────────────────────────────

  if (query.trim() && query.trim().length >= 3) {
    // Non-blocking: log to Redis sorted set
    zincrby(KEYS.popularSearches(), 1, query.toLowerCase().trim()).catch(() => {});
  }

  return {
    results: mappedRows,
    total,
    page,
    totalPages,
    queryTimeMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETE  — fast prefix search (< 100ms target)
// Combines: recent searches (Redis), popular searches (Redis), title prefix (DB)
// ─────────────────────────────────────────────────────────────────────────────

export type AutocompleteResult = {
  type: "recent" | "popular" | "document" | "category";
  label: string;
  sublabel?: string;
  href?: string;
  documentId?: string;
  documentSlug?: string;
  categoryId?: string;
};

export async function getAutocomplete(
  prefix: string,
  userId?: string,
  limit: number = 8
): Promise<AutocompleteResult[]> {
  if (!prefix || prefix.trim().length < 2) return [];

  const cacheKey = KEYS.autocomplete(`${prefix}:${userId ?? "anon"}`);
  const cached = await getCache<AutocompleteResult[]>(cacheKey);
  if (cached) return cached;

  const results: AutocompleteResult[] = [];
  const q = prefix.toLowerCase().trim();

  // 1. Recent searches for this user (from Redis)
  if (userId && redis) {
    try {
      const recentKey = KEYS.recentSearches(userId);
      const recent = await redis.zrange(recentKey, 0, 2, { rev: true });
      const matchingRecent = (recent as string[]).filter((s) =>
        s.toLowerCase().includes(q)
      );
      results.push(
        ...matchingRecent.slice(0, 2).map((s) => ({
          type: "recent" as const,
          label: s,
        }))
      );
    } catch (error) {
      console.warn("[Search] Failed to get recent searches:", error);
    }
  }

  // 2. Popular searches globally (from Redis)
  const popular = redis ? await redis.zrange(KEYS.popularSearches(), 0, 19, { rev: true }) : [];
  const matchingPopular = (popular as string[])
    .filter((s) => s.toLowerCase().startsWith(q))
    .slice(0, 2);
  results.push(
    ...matchingPopular.map((s) => ({ type: "popular" as const, label: s }))
  );

  // 3. Category matches
  const catCacheKey = KEYS.categories();
  const cachedCategories = await getCache<{ id: string; name: string; slug: string }[]>(
    catCacheKey
  );
  if (cachedCategories) {
    const matchingCats = cachedCategories
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 2);
    results.push(
      ...matchingCats.map((c) => ({
        type: "category" as const,
        label: c.name,
        sublabel: "Browse category",
        href: `/search?category=${c.id}`,
        categoryId: c.id,
      }))
    );
  }

  // 4. Document title prefix search (DB — fastest via GIN tsvector index)
  const docRows = await db.execute<{
    id: string;
    slug: string;
    title: string;
    institution_name: string | null;
  }>(sql`
    SELECT d.id, d.slug, d.title, i.name AS institution_name
    FROM documents d
    LEFT JOIN institutions i ON i.id = d.institution_id
    WHERE d.status = 'approved'
      AND d.visibility = 'public'
      AND d.deleted_at IS NULL
      AND d.search_vector @@ to_tsquery('english', ${q + ":*"})
    ORDER BY d.download_count DESC
    LIMIT 4
  `);

  results.push(
    ...docRows.rows.map((d) => ({
      type: "document" as const,
      label: d.title,
      sublabel: d.institution_name ?? undefined,
      href: `/d/${d.slug}`,
      documentId: d.id,
      documentSlug: d.slug,
    }))
  );

  // Deduplicate and limit
  const unique = results
    .filter(
      (item, index, arr) =>
        arr.findIndex((i) => i.label === item.label) === index
    )
    .slice(0, limit);

  await setCache(cacheKey, unique, TTL.autocomplete);

  return unique;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTION: "Did you mean?" using trigram similarity
// ─────────────────────────────────────────────────────────────────────────────

export async function getSpellingSuggestion(
  query: string
): Promise<string | null> {
  if (query.length < 4) return null;

  const result = await db.execute<{ suggestion: string; similarity: number }>(sql`
    SELECT title AS suggestion, similarity(title, ${query}) AS similarity
    FROM documents
    WHERE status = 'approved'
      AND similarity(title, ${query}) > 0.3
    ORDER BY similarity DESC
    LIMIT 1
  `);

  const top = result.rows[0];
  if (!top || top.similarity < 0.35) return null;

  // Only suggest if meaningfully different
  if (top.suggestion.toLowerCase() === query.toLowerCase()) return null;

  return top.suggestion;
}
