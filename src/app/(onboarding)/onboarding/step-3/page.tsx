import type { Metadata } from "next";
import { InterestTagsStep } from "@/components/features/auth/InterestTagsStep";
import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { redis, KEYS } from "@/lib/redis/client";

export const metadata: Metadata = { title: "Step 3 — Your Interests" };

export default async function OnboardingStep3Page() {
  // Load all active tags — cached in Redis
  const cacheKey = KEYS.tagsAll();
  const cached   = await redis.get<{ id: string; name: string; slug: string }[]>(cacheKey);

  const allTags = cached ?? (await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(tags)
    .where(eq(tags.isActive, true))
    .orderBy(desc(tags.usageCount)));

  if (!cached) {
    await redis.setex(cacheKey, 3600, allTags);
  }

  // Get user's institution name for "trending at X" section
  const session     = await auth();
  const institutionName =
    (session?.user as any)?.institutionId
      ? "your institution"
      : "your institution";

  // Pick 6 "trending" tags (top by usage count)
  const trending = allTags.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Step 3 of 3
        </p>
        <h2 className="font-heading font-bold text-foreground text-2xl tracking-tight">
          What topics interest you?
        </h2>
        <p className="text-sm text-muted-foreground">
          Select at least 3 to personalize your Academic Pulse feed.
        </p>
      </div>

      <InterestTagsStep
        allTags={allTags}
        trendingTags={trending}
        institutionName={institutionName}
      />
    </div>
  );
}