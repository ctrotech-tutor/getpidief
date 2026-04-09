import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCache, setCache, KEYS, TTL } from "@/lib/redis/client";

export const runtime = "nodejs";

export async function GET() {
  const cacheKey = KEYS.tagsPopular(100);
  const cached   = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  }

  const rows = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, usageCount: tags.usageCount })
    .from(tags)
    .where(eq(tags.isActive, true))
    .orderBy(desc(tags.usageCount))
    .limit(100);

  await setCache(cacheKey, rows, TTL.tagsPopular);
  return NextResponse.json({ data: rows });
}