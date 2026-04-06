import type { MetadataRoute } from "next";
import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { eq, desc, isNull } from "drizzle-orm";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/explore`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // Dynamic document pages
  const docs = await db
    .select({ slug: documents.slug, updatedAt: documents.updatedAt })
    .from(documents)
    .where(eq(documents.status, "approved"))
    .orderBy(desc(documents.updatedAt))
    .limit(50000); // Google sitemap limit

  const docPages: MetadataRoute.Sitemap = docs.map((doc) => ({
    url: `${BASE_URL}/d/${doc.slug}`,
    lastModified: doc.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic profile pages (public only)
  const publicUsers = await db
    .select({ username: users.username, updatedAt: users.updatedAt })
    .from(users)
    .where(eq(users.status, "active"))
    .limit(10000);

  const profilePages: MetadataRoute.Sitemap = publicUsers.map((u) => ({
    url: `${BASE_URL}/u/${u.username}`,
    lastModified: u.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...docPages, ...profilePages];
}
