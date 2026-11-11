"use server";
import { db, withTransaction } from "@/lib/db/client";
import { users, userInterests, tags, institutions, authUsers } from "@/lib/db/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/auth";
import { redis, KEYS } from "@/lib/redis/client";
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

  const skipped = formData.get("skip") === "yes";
  const parsed = onboardingStep1Schema.safeParse({ institutionId: formData.get("institutionId") });
  if (!skipped && !parsed.success) return actionError("Please select an institution or continue without one.");
  const institutionId = !skipped && parsed.success ? parsed.data.institutionId : null;
  if (institutionId) {
    const institution = await db.query.institutions.findFirst({
      where: and(eq(institutions.id, institutionId), eq(institutions.isActive, true)),
      columns: { id: true },
    });
    if (!institution) return actionError("That institution is no longer available. Please choose another.");
  }
  await db.update(users).set({
    institutionId,
    onboardingStep: sql`greatest(${users.onboardingStep}, 2)`,
    updatedAt: new Date(),
  }).where(and(eq(users.id, userId), eq(users.onboardingComplete, false)));

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

  const skipped = formData.get("skip") === "yes";
  if (skipped) {
    await db.update(users).set({ onboardingStep: sql`greatest(${users.onboardingStep}, 3)`, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.onboardingComplete, false)));
    return actionSuccess({ next: "/onboarding/step-3" });
  }
  const parsed = onboardingStep2Schema.safeParse({
    faculty: formData.get("faculty"),
    major: formData.get("major"),
    academicLevel: formData.get("academicLevel"),
    academicYear: formData.get("academicYear") ? Number(formData.get("academicYear")) : undefined,
    isContributor: formData.get("isContributor") === "on",
  });
  if (!parsed.success) return actionError(Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Please check your details.");
  await db.update(users).set({
    faculty: parsed.data.faculty,
    major: parsed.data.major,
    academicLevel: parsed.data.academicLevel,
    academicYear: parsed.data.academicYear ?? null,
    onboardingStep: sql`greatest(${users.onboardingStep}, 3)`,
    updatedAt: new Date(),
  }).where(and(eq(users.id, userId), eq(users.onboardingComplete, false)));

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

  const skipped = formData.get("skip") === "yes";
  const rawTagIds = formData.getAll("tagIds");
  const parsed = onboardingStep3Schema.safeParse({ tagIds: rawTagIds });
  if (!skipped && !parsed.success) return actionError("Choose at least 3 topics, or continue without them.");
  const uniqueTagIds = skipped || !parsed.success ? [] : [...new Set(parsed.data.tagIds)];
  if (!skipped && uniqueTagIds.length < 3) return actionError("Choose at least 3 different topics.");
  const existingTags = uniqueTagIds.length ? await db.select({ id: tags.id }).from(tags)
    .where(and(inArray(tags.id, uniqueTagIds), eq(tags.isActive, true))) : [];
  const validTagIds = existingTags.map((tag) => tag.id);
  if (validTagIds.length !== uniqueTagIds.length) return actionError("Some topics are no longer available. Please choose again.");

  const completed = await withTransaction(async (tx) => {
    // Claim completion once, so retries do not inflate counts or enqueue duplicate events.
    const claimed = await tx.update(users).set({ onboardingComplete: true, onboardingStep: 3, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.onboardingComplete, false)))
      .returning({ institutionId: users.institutionId });
    if (!claimed.length) return null;
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));
    if (validTagIds.length) {
      await tx.insert(userInterests).values(validTagIds.map((tagId) => ({ userId, tagId }))).onConflictDoNothing();
      await tx.update(tags).set({ usageCount: sql`${tags.usageCount} + 1` }).where(inArray(tags.id, validTagIds));
    }
    return claimed[0];
  });
  if (completed) {
    if (redis) {
      try { await redis.del(KEYS.onboardingState(userId), KEYS.recommended(userId)); }
      catch (error) { console.warn("[Onboarding] Cache cleanup failed:", error); }
    }
    try {
      await inngest.send({ name: "user/onboarding-completed", data: { userId, institutionId: completed.institutionId ?? "", tagIds: validTagIds } });
    } catch (error) { console.warn("[Onboarding] Completion event failed:", error); }
  }

  return actionSuccess({ next: "/" });
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION SEARCH API helper (called from onboarding step 1 UI)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchInstitutions(query: string) {
  await requireAuth();
  const trimmed = query.trim();

  if (trimmed.length < 2) return [];
  // Literal substring search avoids interpreting punctuation as tsquery syntax.
  const pattern = `%${trimmed.slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;
  return db.select({ id: institutions.id, name: institutions.name, slug: institutions.slug,
    country: institutions.country, countryCode: institutions.countryCode,
    type: institutions.type, logoUrl: institutions.logoUrl, documentCount: institutions.documentCount })
    .from(institutions)
    .where(and(eq(institutions.isActive, true), sql`${institutions.name} ILIKE ${pattern} ESCAPE '\\'`))
    .orderBy(institutions.name).limit(10);
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