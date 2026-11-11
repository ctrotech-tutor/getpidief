"use server";
import { db, withTransaction } from "@/lib/db/client";
import { users, userInterests, tags, institutions, authUsers } from "@/lib/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
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
  _: unknown,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();
  await ensureUserProfile(userId);

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
  const existing = redis ? await redis.get<Record<string, unknown>>(stateKey) ?? {} : {};
  if (redis) {
    try {
      await redis.setex(stateKey, TTL.onboardingState, {
        ...existing,
        institutionId: parsed.data.institutionId,
        step: 2,
      });
    } catch (error) {
      console.warn("[Onboarding] Failed to cache state:", error);
    }
  }

  return actionSuccess({ next: "/onboarding/step-2" });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Save academic focus
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep2(
  _: unknown,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();
  await ensureUserProfile(userId);

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
      academicLevel:  parsed.data.academicLevel,
      academicYear:   parsed.data.academicYear,
      role:           parsed.data.isContributor ? "contributor" : "student",
      onboardingStep: 3,
      updatedAt:      new Date(),
    })
    .where(eq(users.id, userId));

  const stateKey = KEYS.onboardingState(userId);
  const existing = redis ? await redis.get<Record<string, unknown>>(stateKey) ?? {} : {};
  if (redis) {
    try {
      await redis.setex(stateKey, TTL.onboardingState, {
        ...existing,
        faculty: parsed.data.faculty,
        major:   parsed.data.major,
        step:    3,
      });
    } catch (error) {
      console.warn("[Onboarding] Failed to cache state:", error);
    }
  }

  return actionSuccess({ next: "/onboarding/step-3" });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Save interest tags + complete onboarding
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep3(
  _: unknown,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();
  await ensureUserProfile(userId);

  // tagIds submitted as multiple values: tagIds=uuid1&tagIds=uuid2...
  const rawTagIds = formData.getAll("tagIds") as string[];

  const parsed = onboardingStep3Schema.safeParse({ tagIds: rawTagIds });
  if (!parsed.success) {
    return actionError("Please select at least 3 interests to personalize your feed.");
  }

  const { tagIds } = parsed.data;
  const uniqueTagIds = [...new Set(tagIds)];

  // Validate selected tags still exist and are active.
  const existingTags = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      inArray(tags.id, uniqueTagIds.length ? uniqueTagIds : ["00000000-0000-0000-0000-000000000000"])
    );
  const validTagIds = existingTags.map((t) => t.id);

  if (validTagIds.length < 3) {
    return actionError("Some selected tags are no longer available. Please reselect at least 3 interests.");
  }

  await withTransaction(async (tx) => {
    // Delete existing interests
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));

    // Insert new interests
    if (validTagIds.length > 0) {
      await tx.insert(userInterests).values(
        validTagIds.map((tagId) => ({ userId, tagId }))
      ).onConflictDoNothing();
    }

    // Update tag usage counts
    await tx
      .update(tags)
      .set({
        usageCount: sql`${tags.usageCount} + 1`,
      })
      .where(inArray(tags.id, validTagIds));

    // Mark onboarding complete
    await tx
      .update(users)
      .set({ onboardingComplete: true, onboardingStep: 3, updatedAt: new Date() })
      .where(eq(users.id, userId));
  });

  // Clear onboarding state from Redis
  if (redis) {
    try {
      await redis.del(KEYS.onboardingState(userId));
    } catch (error) {
      console.warn("[Onboarding] Failed to clear onboarding state:", error);
    }
  }
  
  // Invalidate recommendation cache
  if (redis) {
    try {
      await redis.del(KEYS.recommended(userId));
    } catch (error) {
      console.warn("[Onboarding] Failed to invalidate recommendation cache:", error);
    }
  }

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
      tagIds: validTagIds,
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
    const cached = redis ? await redis.get<typeof institutions.$inferSelect[]>(
      KEYS.institutionsPopular()
    ) : null;
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

async function ensureUserProfile(userId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });
  if (existing) return;

  const authUser = await db.query.authUsers.findFirst({
    where: eq(authUsers.id, userId),
    columns: { email: true, name: true },
  });
  if (!authUser?.email) {
    throw new Error("Unable to initialize profile for authenticated user.");
  }

  const baseFromEmail = authUser.email.split("@")[0] ?? "scholar";
  const normalized = baseFromEmail.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const baseUsername = (normalized || "scholar").slice(0, 40);
  const displayName = authUser.name?.trim() || "Scholar";

  for (let i = 0; i < 6; i++) {
    const suffix = i === 0 ? "" : `_${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate = `${baseUsername}${suffix}`.slice(0, 50);
    try {
      await db.insert(users).values({
        id: userId,
        username: candidate,
        displayName,
      });
      return;
    } catch {
      // Retry on username collisions or race conditions.
    }
  }

  throw new Error("Could not create user profile record. Please retry.");
}