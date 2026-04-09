"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users, userInterests, tags, institutions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/auth";
import { redis, KEYS, TTL } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { actionSuccess, actionError, type ActionResult } from "@/lib/utils/api";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
} from "@/lib/validations/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Save institution selection
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep1(
  _: any,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();

  const parsed = onboardingStep1Schema.safeParse({
    institutionId: formData.get("institutionId"),
  });
  if (!parsed.success) return actionError("Please select your institution.");

  await db
    .update(users)
    .set({
      institutionId:  parsed.data.institutionId,
      onboardingStep: 2,
      updatedAt:      new Date(),
    })
    .where(eq(users.id, userId));

  // Cache partial state in Redis (in case user refreshes mid-flow)
  const stateKey = KEYS.onboardingState(userId);
  const existing = await redis.get<Record<string, unknown>>(stateKey) ?? {};
  await redis.setex(stateKey, TTL.onboardingState, {
    ...existing,
    institutionId: parsed.data.institutionId,
    step: 2,
  });

  return actionSuccess({ next: "/onboarding/step-2" });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Save academic focus
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep2(
  _: any,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();

  const parsed = onboardingStep2Schema.safeParse({
    faculty:        formData.get("faculty"),
    major:          formData.get("major"),
    academicLevel:  formData.get("academicLevel"),
    academicYear:   formData.get("academicYear") ? Number(formData.get("academicYear")) : undefined,
    isContributor:  formData.get("isContributor") === "on",
  });

  if (!parsed.success) {
    return actionError(
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Please complete all fields."
    );
  }

  await db
    .update(users)
    .set({
      faculty:        parsed.data.faculty,
      major:          parsed.data.major,
      academicLevel:  parsed.data.academicLevel as any,
      academicYear:   parsed.data.academicYear,
      role:           parsed.data.isContributor ? "contributor" : "student",
      onboardingStep: 3,
      updatedAt:      new Date(),
    })
    .where(eq(users.id, userId));

  const stateKey = KEYS.onboardingState(userId);
  const existing = await redis.get<Record<string, unknown>>(stateKey) ?? {};
  await redis.setex(stateKey, TTL.onboardingState, {
    ...existing,
    faculty: parsed.data.faculty,
    major:   parsed.data.major,
    step:    3,
  });

  return actionSuccess({ next: "/onboarding/step-3" });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Save interest tags + complete onboarding
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep3(
  _: any,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();

  // tagIds submitted as multiple values: tagIds=uuid1&tagIds=uuid2...
  const rawTagIds = formData.getAll("tagIds") as string[];

  const parsed = onboardingStep3Schema.safeParse({ tagIds: rawTagIds });
  if (!parsed.success) {
    return actionError("Please select at least 3 interests to personalize your feed.");
  }

  const { tagIds } = parsed.data;

  await db.transaction(async (tx) => {
    // Delete existing interests
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));

    // Insert new interests
    if (tagIds.length > 0) {
      await tx.insert(userInterests).values(
        tagIds.map((tagId) => ({ userId, tagId }))
      );
    }

    // Update tag usage counts
    await tx.execute(
      sql`UPDATE tags SET usage_count = usage_count + 1 WHERE id = ANY(${tagIds}::uuid[])`
    );

    // Mark onboarding complete
    await tx
      .update(users)
      .set({ onboardingComplete: true, onboardingStep: 3, updatedAt: new Date() })
      .where(eq(users.id, userId));
  });

  // Clear onboarding state from Redis
  await redis.del(KEYS.onboardingState(userId));

  // Invalidate recommendation cache
  await redis.del(KEYS.recommended(userId));

  // Fetch institution for the event
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { institutionId: true },
  });

  // Trigger onboarding-completed event (welcome email, recommendation warm-up)
  await inngest.send({
    name: "user/onboarding-completed",
    data: {
      userId,
      institutionId: user?.institutionId ?? "",
      tagIds,
    },
  });

  return actionSuccess({ next: "/explore" });
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION SEARCH API helper (called from onboarding step 1 UI)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchInstitutions(query: string) {
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 2) {
    // Return popular institutions from Redis cache
    const cached = await redis.get<typeof institutions.$inferSelect[]>(
      KEYS.institutionsPopular()
    );
    if (cached) return cached;
  }

  // Match the full-text index expression defined in `institutions` schema
  // (see `institutions_name_search_idx`).
  const fts = trimmed.replace(/\s+/g, " & ") + ":*";

  const results = await db.execute<{
    id: string;
    name: string;
    slug: string;
    country: string;
    country_code: string;
    type: string;
    logo_url: string | null;
    document_count: number;
  }>(sql`
    SELECT id, name, slug, country, country_code, type, logo_url, document_count
    FROM institutions
    WHERE is_active = true
      AND (
        to_tsvector(
          'english',
          name || ' ' || coalesce(short_name, '')
        ) @@ to_tsquery('english', ${fts})
      )
    ORDER BY document_count DESC, name ASC
    LIMIT 10
  `);

  return results.rows;
}