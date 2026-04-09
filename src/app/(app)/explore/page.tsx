import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth/auth";
import { SearchBar } from "@/components/features/search/SearchBar";
import { CategoriesStrip, CategoriesStripSkeleton } from "@/components/features/search/CategoriesStrip";
import { PulseFeed } from "@/components/features/dashboard/PulseFeed";
import { ResourceCard, ResourceCardSkeleton } from "@/components/features/documents/ResourceCard";
import { documentsRepository } from "@/lib/db/repositories/documents";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCache, setCache, KEYS, TTL } from "@/lib/redis/client";

export const metadata: Metadata = {
  title:       "Explore — getpidief",
  description: "Discover millions of verified academic resources.",
};

export const revalidate = 60;

export default async function ExplorePage() {
  const session = await auth();
  const user    = session?.user as any;
  const first   = (user?.displayName ?? user?.name ?? "Scholar").split(" ")[0];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-10">
      <section className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight mb-1">
            {getGreeting()}, {first}.
          </h1>
          <p className="text-muted-foreground text-sm">What are you researching today?</p>
        </div>
        <SearchBar size="lg" placeholder="Search by title, course, keyword, institution…" />
        <Suspense fallback={<CategoriesStripSkeleton />}>
          <CategoriesSection />
        </Suspense>
      </section>

      <PulseFeed />

      <Suspense fallback={<ResourceGridSkeleton title="Recommended for You" />}>
        <RecommendedSection userId={user?.id} />
      </Suspense>

      <Suspense fallback={<ResourceGridSkeleton title="Trending This Week" />}>
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<ResourceGridSkeleton title="Recently Added" />}>
        <RecentSection />
      </Suspense>
    </div>
  );
}

async function CategoriesSection() {
  const cacheKey = KEYS.categories();
  const cached   = await getCache<any[]>(cacheKey);
  const rows = cached ?? (await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, color: categories.color, icon: categories.icon, isFeatured: categories.isFeatured, documentCount: categories.documentCount })
    .from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)));
  if (!cached) await setCache(cacheKey, rows, TTL.categories);
  return <CategoriesStrip categories={rows} />;
}

async function RecommendedSection({ userId }: { userId?: string }) {
  const docs = await (userId ? documentsRepository.getRecommended(userId, 6) : documentsRepository.getTrending({ limit: 6 }));
  if (!docs.length) return null;
  return <ResourceGridSection title="Recommended for You" href="/search?sort=relevance" docs={docs} />;
}

async function TrendingSection() {
  const docs = await documentsRepository.getTrending({ limit: 6 });
  if (!docs.length) return null;
  return <ResourceGridSection title="Trending This Week" href="/search?sort=downloads" emoji="🔥" docs={docs} />;
}

async function RecentSection() {
  const docs = await documentsRepository.getRecent({ limit: 6 });
  if (!docs.length) return null;
  return <ResourceGridSection title="Recently Added" href="/search?sort=recent" emoji="🕐" docs={docs} />;
}

function ResourceGridSection({ title, href, emoji, docs }: { title: string; href: string; emoji?: string; docs: any[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-foreground text-lg tracking-tight">
          {emoji && <span className="mr-2">{emoji}</span>}{title}
        </h2>
        <a href={href} className="text-xs text-muted-foreground hover:text-primary transition-colors">See all →</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => <ResourceCard key={doc.id} document={doc} variant="grid" />)}
      </div>
    </section>
  );
}

function ResourceGridSkeleton({ title }: { title: string }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-6 w-48 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map((i) => <ResourceCardSkeleton key={i} />)}
      </div>
    </section>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}