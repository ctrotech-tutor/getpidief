import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { categories, documents } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { KEYS, TTL, getCache, setCache } from "@/lib/redis/client";

export const runtime = "nodejs";

export async function GET() {
  const cacheKey = KEYS.categories();
  const cached   = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  }

  const rows = await db
    .select({
      id:          categories.id,
      name:        categories.name,
      slug:        categories.slug,
      icon:        categories.icon,
      color:       categories.color,
      parentId:    categories.parentId,
      isFeatured:  categories.isFeatured,
      sortOrder:   categories.sortOrder,
      documentCount: sql<number>`
        coalesce((
          select count(*)::int
          from ${documents} d
          where d.category_id = ${categories.id}
            and d.status = 'approved'
            and d.visibility = 'public'
            and d.deleted_at is null
        ), 0)
      `,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));

  await setCache(cacheKey, rows, TTL.categories);

  return NextResponse.json({ data: rows }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}