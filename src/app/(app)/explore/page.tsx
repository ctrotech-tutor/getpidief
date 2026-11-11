import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth/auth";
import { SearchBar } from "@/components/features/search/SearchBar";
import { CategoriesStrip, CategoriesStripSkeleton } from "@/components/features/search/CategoriesStrip";
import { PulseFeed } from "@/components/features/dashboard/PulseFeed";
import { ResourceCard, ResourceCardSkeleton } from "@/components/features/documents/ResourceCard";
import { ShareModal } from "@/components/features/documents/ShareModal";
import { ReportModal } from "@/components/features/documents/ReportModal";
import { documentsRepository } from "@/lib/db/repositories/documents";
import type { DocumentCard } from "@/lib/db/repositories/documents";
import { db } from "@/lib/db/client";
import { categories, documents } from "@/lib/db/schema";
import { getFirstName } from "@/lib/utils/format";
import { eq, asc, sql } from "drizzle-orm";
import { getCache, setCache, KEYS, TTL } from "@/lib/redis/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, TrendingUp, Clock, Star, BookOpen, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { ExploreHeroSection } from "@/components/features/explore/ExploreHeroSection";
import { ExploreCategoriesSection } from "@/components/features/explore/ExploreCategoriesSection";
import { ExploreContentSections } from "@/components/features/explore/ExploreContentSections";
import { ResourceGrid } from "@/components/features/explore/ResourceGrid";
import { ExploreSidebar } from "@/components/features/explore/ExploreSidebar";
import { ExploreSidebarClient } from "@/components/features/explore/ExploreSidebarClient";

type SessionUser = {
  id?: string;
  displayName?: string | null;
  name?: string | null;
  username?: string;
  avatarUrl?: string | null;
  reputationScore?: number;
  reputationLevel?: string;
  institutionId?: string | null;
  institutionName?: string;
  role?: string;
  uploadCount?: number;
  followerCount?: number;
  followingCount?: number;
};

type ExploreCategory = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  isFeatured: boolean;
  documentCount: number;
};

export const metadata: Metadata = {
  title:       "Explore — getpidief",
  description: "Discover millions of verified academic resources.",
};

export const revalidate = 60;

export default async function ExplorePage() {
  const session = await auth();
  const user = (session?.user ?? null) as SessionUser | null;
  const first   = getFirstName(user?.displayName ?? user?.name, "Scholar");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Sticky on desktop */}
          <ExploreSidebarClient serverUser={user} />

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-12">
            <ExploreHeroSection firstName={first} />
            <ExploreCategoriesSection>
              <CategoriesSection />
            </ExploreCategoriesSection>
            <ExploreContentSections
              userId={user?.id}
              recommendedSection={<RecommendedSection userId={user?.id} />}
              trendingSection={<TrendingSection />}
              recentSection={<RecentSection />}
            />
          </div>
        </div>
      </div>
      <ShareModal />
      <ReportModal />
    </div>
  );
}

async function CategoriesSection() {
  const cacheKey = KEYS.categories();
  const cached = await getCache<ExploreCategory[]>(cacheKey);
  const rows = cached ?? (await withDbRetry(() =>
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        color: categories.color,
        icon: categories.icon,
        isFeatured: categories.isFeatured,
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
      .orderBy(asc(categories.sortOrder))
  ));
  if (!cached) await setCache(cacheKey, rows, TTL.categories);
  return <CategoriesStrip categories={rows} />;
}

async function RecommendedSection({ userId }: { userId?: string }) {
  const docs = await (userId ? documentsRepository.getRecommended(userId, 6) : documentsRepository.getTrending({ limit: 6 }));
  if (!docs.length) return null;
  return <ResourceSection title="Recommended for You" href="/search?sort=relevance" docs={docs} />;
}

async function TrendingSection() {
  const docs = await documentsRepository.getTrending({ limit: 6 });
  if (!docs.length) return null;
  return <ResourceSection title="Trending This Week" href="/search?sort=downloads" emoji="🔥" docs={docs} />;
}

async function RecentSection() {
  const docs = await documentsRepository.getRecent({ limit: 6 });
  if (!docs.length) return null;
  return <ResourceSection title="Recently Added" href="/search?sort=recent" emoji="🕐" docs={docs} />;
}

function ResourceSection({
  title,
  href,
  emoji,
  docs,
}: {
  title: string;
  href: string;
  emoji?: string;
  docs: DocumentCard[];
}) {
  return (
    <Card className="border-border/50 bg-background/60 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            {emoji && <span className="text-2xl">{emoji}</span>}
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
            <a href={href}>
              See all
              <TrendingUp className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResourceGrid docs={docs} />
      </CardContent>
    </Card>
  );
}

function ResourceGridSkeleton({ title }: { title: string }) {
  return (
    <Card className="border-border/50 bg-background/60 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-7 w-64 rounded" aria-label={title} />
          <div className="skeleton h-9 w-20 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <ResourceCardSkeleton />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
      const err = error as { message?: string; cause?: { message?: string } | string };
      const message = String(err?.message ?? "");
      const cause = String(err?.cause && typeof err.cause === "object" ? err.cause.message : err?.cause ?? "");
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