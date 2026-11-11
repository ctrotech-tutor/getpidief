import { db } from "@/lib/db/client";
import { categories, tags, institutions } from "@/lib/db/schema";
import { eq, asc, desc, ilike } from "drizzle-orm";
import { redis, KEYS, TTL, getCache, setCache, invalidateCache } from "@/lib/redis/client";

export const categoriesRepository = {
  async getAll() {
    const cached = await getCache<any[]>(KEYS.categories());
    if (cached) return cached;
    const rows = await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: [asc(categories.sortOrder)],
    });
    await setCache(KEYS.categories(), rows, TTL.categories);
    return rows;
  },

  async getBySlug(slug: string) {
    return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  },

  async invalidateCache() {
    await invalidateCache(KEYS.categories());
  },
};

export const tagsRepository = {
  async getPopular(limit = 50) {
    const key = KEYS.tagsPopular(limit);
    const cached = await getCache<any[]>(key);
    if (cached) return cached;
    const rows = await db.query.tags.findMany({
      where: eq(tags.isActive, true),
      orderBy: [desc(tags.usageCount)],
      limit,
    });
    await setCache(key, rows, TTL.tagsPopular);
    return rows;
  },

  async search(q: string, limit = 8) {
    return db.query.tags.findMany({
      where: ilike(tags.name, `%${q}%`),
      orderBy: [desc(tags.usageCount)],
      limit,
    });
  },
};