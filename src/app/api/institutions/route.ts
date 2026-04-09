import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { institutions } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { redis, KEYS, TTL, getCache, setCache } from "@/lib/redis/client";

export const runtime = "nodejs"; // needs DB access

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  // Popular institutions (no query) — cache aggressively
  if (q.length < 2) {
    const cacheKey = KEYS.institutionsPopular();
    const cached   = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ data: cached }, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
      });
    }

    const rows = await db
      .select({
        id:           institutions.id,
        name:         institutions.name,
        slug:         institutions.slug,
        country:      institutions.country,
        countryCode:  institutions.countryCode,
        type:         institutions.type,
        logoUrl:      institutions.logoUrl,
        documentCount:institutions.documentCount,
      })
      .from(institutions)
      .where(eq(institutions.isActive, true))
      .orderBy(desc(institutions.documentCount))
      .limit(8);

    await setCache(cacheKey, rows, TTL.institutionsPopular);
    return NextResponse.json({ data: rows }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  }

  // Search query — PostgreSQL FTS with prefix matching
  const result = await db.execute<{
    id: string; name: string; slug: string; country: string;
    country_code: string; type: string; logo_url: string | null;
    document_count: number;
  }>(sql`
    SELECT
      id, name, slug, country, country_code, type, logo_url, document_count
    FROM institutions
    WHERE is_active = true
      AND (
        to_tsvector(
          'english',
          name || ' ' || coalesce(short_name, '')
        ) @@ to_tsquery('english', ${q.replace(/\s+/g, " & ") + ":*"})
        OR name ILIKE ${"%" + q + "%"}
      )
    ORDER BY
      CASE WHEN name ILIKE ${q + "%"} THEN 0 ELSE 1 END,
      document_count DESC,
      name ASC
    LIMIT 10
  `);

  return NextResponse.json({ data: result.rows });
}